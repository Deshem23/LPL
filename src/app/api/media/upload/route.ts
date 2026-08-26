import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/actions';
import { randomUUID, createHash } from 'crypto';
import { logAction } from '@/lib/services/audit-service';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Formats sharp can safely re-encode. SVGs are vector (resizing/raster
// re-encoding would just rasterize them for no benefit) and GIFs are
// often animated (sharp would flatten them to a single static frame) -
// both are uploaded as-is, unresized.
const RESIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Long-edge cap per upload context - avatars are only ever shown small
// (profile menus, author bylines), so they get a much smaller ceiling
// than general article/media images.
const MAX_DIMENSIONS: Record<string, number> = {
  avatar: 512,
};
const DEFAULT_MAX_DIMENSION = 2000;

/**
 * Downscales and re-compresses an uploaded image before it's written to
 * Storage. Every byte here is billed egress on every future view (this is
 * the same "Egress Exceeded" issue already fixed for list-query payloads
 * in article-service.ts) - a phone photo uploaded straight through could
 * be 4000px/4-5MB for something that only ever renders at a few hundred
 * pixels wide. Falls back to the original, untouched buffer on any sharp
 * failure (corrupt/unusual file, unsupported variant, etc.) so a resize
 * problem never blocks the upload itself.
 */
async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
  type: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!RESIZABLE_TYPES.has(mimeType)) {
    return { buffer, mimeType };
  }

  try {
    const maxDimension = MAX_DIMENSIONS[type] ?? DEFAULT_MAX_DIMENSION;
    const image = sharp(buffer, { failOn: 'none' }).rotate(); // .rotate() with no args auto-orients from EXIF, then strips it
    const metadata = await image.metadata();

    let pipeline = image;
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > maxDimension || metadata.height > maxDimension)
    ) {
      pipeline = pipeline.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    let optimized: Buffer;
    let outMimeType = mimeType;
    if (mimeType === 'image/png') {
      optimized = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    } else if (mimeType === 'image/webp') {
      optimized = await pipeline.webp({ quality: 82 }).toBuffer();
    } else {
      optimized = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      outMimeType = 'image/jpeg';
    }

    // Only use the re-encode if it's actually smaller - a tiny/already
    // well-compressed image can occasionally grow slightly under a fresh
    // encode, and there's no point trading quality for a larger file.
    if (optimized.length < buffer.length) {
      return { buffer: optimized, mimeType: outMimeType };
    }
    return { buffer, mimeType };
  } catch (err) {
    console.error('Image optimization failed, using original file:', err);
    return { buffer, mimeType };
  }
}

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    // Was completely unauthenticated - anyone who found this URL could
    // upload arbitrary files into the site's storage bucket and media
    // table. Now requires a logged-in session; used both by the admin
    // media library (any of the 4 roles that can reach /admin/media) and
    // by the self-service "avatar" upload on /admin/profile and the
    // admin's "edit user" dialog.
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string || 'image';
    const altText = formData.get('altText') as string || '';
    const caption = formData.get('caption') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `"${file.name}" dépasse la taille maximale de 5 Mo.` },
          { status: 400 }
        );
      }
    }

    // Avatar uploads specifically are always images - an authenticated
    // but non-admin user (any role can upload their own avatar) should
    // not be able to use this path to drop a video/pdf/whatever into
    // storage under the guise of a profile picture.
    if (type === 'avatar' && files.some((f) => !f.type.startsWith('image/'))) {
      return NextResponse.json(
        { error: 'La photo de profil doit être une image.' },
        { status: 400 }
      );
    }

    // Service-role client - storage uploads and the media table INSERT
    // policy both key off auth.jwt() ->> 'role', which the regular
    // client's session JWT may not actually carry as a top-level claim
    // (same gap already worked around for ads/articles/categories - see
    // src/lib/supabase/admin.ts).
    const supabase = createAdminClient();
    const uploadedMedia = [];
    // Was previously just console.error()'d and skipped per-file, so a
    // failure on every file still returned {success:true, media:[]} with
    // an HTTP 200 - the browser had no way to tell "nothing uploaded"
    // from "it worked but there was nothing to upload", and the real
    // reason (e.g. the storage bucket not existing, or a DB constraint
    // rejecting the row) only ever showed up in the server log, never to
    // whoever was actually trying to upload.
    const failures: string[] = [];

    for (const file of files) {
      // Hash the file's actual bytes (not its name - two different
      // filenames can be the exact same image, e.g. a re-download or a
      // re-export) so an identical re-upload can be detected and reused
      // instead of creating a duplicate file + row every time (per the
      // admin's "i dont want to have the same media duplicated" request).
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const contentHash = createHash('sha256').update(fileBuffer).digest('hex');

      // Only matches against media that's still actually in use - see
      // the partial unique index on media.content_hash in
      // migrations/20_recycle_bin_and_media_dedup.sql. A file whose only
      // prior copy has since been trashed is treated as new, so it can
      // be uploaded (and restored into active use) again cleanly.
      const { data: existingMedia } = await supabase
        .from('media')
        .select('*')
        .eq('content_hash', contentHash)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingMedia) {
        uploadedMedia.push(existingMedia);
        continue;
      }

      // Dedup above hashes the ORIGINAL bytes on purpose - two different
      // uploads of the exact same source photo should always match each
      // other regardless of this step, and re-running the resize/encode
      // on a byte-identical re-upload isn't deterministic enough to rely
      // on for a content-hash match. The optimized bytes are what
      // actually gets uploaded and stored below.
      const { buffer: optimizedBuffer, mimeType: optimizedMimeType } =
        await optimizeImage(fileBuffer, file.type, type);

      const fileExt = file.name.split('.').pop();
      const fileName = `${randomUUID()}.${fileExt}`;
      const filePath = `media/${type}/${fileName}`;

      // Upload to Supabase Storage. cacheControl is a full year - safe
      // because filePath always embeds a fresh randomUUID() (see above),
      // so a given path is only ever written once and its bytes never
      // change under it; there's no "this URL got overwritten" case to
      // worry about invalidating. Without this, Supabase's default is a
      // much shorter cache lifetime, so every repeat view of the same
      // image (every card/thumbnail render, across every visitor) was
      // re-downloading it from Storage instead of being served from a
      // browser/CDN/Next Image Optimization cache - a meaningful chunk
      // of the "Egress Exceeded" quota warning on the Supabase project.
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, optimizedBuffer, {
          contentType: optimizedMimeType,
          cacheControl: '31536000',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        failures.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Save to database
      const { data: media, error: dbError } = await supabase
        .from('media')
        .insert({
          url: publicUrl,
          type,
          alt_text: altText,
          caption,
          file_name: file.name,
          file_size: optimizedBuffer.length,
          mime_type: optimizedMimeType,
          content_hash: contentHash,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        failures.push(`${file.name}: ${dbError.message}`);
        continue;
      }

      uploadedMedia.push(media);

      logAction({
        userId: authUser.id,
        action: 'media.upload',
        entityType: 'media',
        entityId: media.id,
        details: { fileName: file.name, type, fileSize: optimizedBuffer.length, originalFileSize: file.size },
      });
    }

    // Nothing made it through - report the real reason instead of a
    // fake 200/success with an empty array.
    if (uploadedMedia.length === 0 && failures.length > 0) {
      return NextResponse.json(
        { error: failures.join(' | '), success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      media: uploadedMedia,
      count: uploadedMedia.length,
      // Present when some files uploaded and others didn't, so a
      // multi-file caller (the admin media library) can still tell the
      // partial failure apart from a clean success.
      ...(failures.length > 0 ? { failures } : {}),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
