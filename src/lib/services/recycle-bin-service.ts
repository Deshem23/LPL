import { createAdminClient } from '@/lib/supabase/admin';
import {
  getTrashedArticles,
  restoreArticle,
  permanentlyDeleteArticle,
  type Article,
} from './article-service';
import {
  getTrashedUsers,
  restoreUser,
  permanentlyDeleteUser,
  type User,
} from './user-service';

/**
 * Shared recycle-bin logic across the three entity types the admin asked
 * to be able to recover after deleting (media, articles, users - see the
 * AskUserQuestion scope decision this feature was built from). Each
 * entity's own service file (article-service.ts, user-service.ts, and
 * the media API routes) owns its own soft-delete/restore/permanent-delete
 * functions; this file adds:
 *   - the media-specific trash operations (there's no media-service.ts -
 *     the media API routes talk to Supabase directly, so this is the one
 *     place those three operations live)
 *   - a single merged "everything in the trash" view for the Trash page
 *   - generic restore/permanently-delete dispatchers keyed by item type,
 *     so the Trash page's UI doesn't need to know which service function
 *     backs which row
 *   - the 30-day auto-purge (per the admin's retention choice)
 */

export type TrashItemType = 'media' | 'article' | 'user';

export interface TrashItem {
  type: TrashItemType;
  id: string;
  /** Display title - file name for media, article title, user name/email. */
  title: string;
  /** Image to show in the trash grid, if any. */
  thumbnail: string | null;
  deletedAt: string;
  /** Days left before purgeExpiredTrash() removes this for good. */
  daysRemaining: number;
}

const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function daysRemaining(deletedAt: string): number {
  const expiresAt = new Date(deletedAt).getTime() + RETENTION_MS;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

// ============================================================
// Media - the only entity type without its own *-service.ts file
// ============================================================

export async function getTrashedMedia(): Promise<any[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching trashed media:', error);
    return [];
  }

  return data || [];
}

export async function restoreMedia(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('media').update({ deleted_at: null }).eq('id', id);
  if (error) {
    console.error('❌ Error restoring media:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * The real, unrecoverable delete for media - removes both the DB row and
 * the actual file in Storage. This is the logic the old (pre-recycle-bin)
 * DELETE /api/media/[id] handler used to run immediately; now it only
 * runs from the trash view's "Delete permanently" action or from
 * purgeExpiredTrash() below.
 */
export async function permanentlyDeleteMedia(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase.from('media').select('url').eq('id', id).single();

  const { error } = await supabase.from('media').delete().eq('id', id);
  if (error) {
    console.error('❌ Error permanently deleting media:', error);
    return { success: false, error: error.message };
  }

  if (existing?.url) {
    const marker = '/object/public/media/';
    const idx = existing.url.indexOf(marker);
    if (idx !== -1) {
      const filePath = existing.url.slice(idx + marker.length);
      try {
        await supabase.storage.from('media').remove([filePath]);
      } catch {
        // Non-fatal - the DB row is already gone either way.
      }
    }
  }

  return { success: true };
}

// ============================================================
// Merged trash view + generic dispatchers
// ============================================================

export async function getAllTrashedItems(): Promise<TrashItem[]> {
  const [media, articles, users] = await Promise.all([
    getTrashedMedia(),
    getTrashedArticles(),
    getTrashedUsers(),
  ]);

  const items: TrashItem[] = [
    ...media.map((m: any) => ({
      type: 'media' as const,
      id: m.id as string,
      title: m.file_name || m.alt_text || 'Média sans nom',
      thumbnail: typeof m.url === 'string' && (m.type === 'image' || m.mime_type?.startsWith('image/')) ? m.url : null,
      deletedAt: m.deleted_at as string,
      daysRemaining: daysRemaining(m.deleted_at),
    })),
    ...articles.map((a: Article) => ({
      type: 'article' as const,
      id: a.id,
      title: a.title,
      thumbnail: a.featured_image || a.cover_image || null,
      deletedAt: a.deleted_at as string,
      daysRemaining: daysRemaining(a.deleted_at as string),
    })),
    ...users.map((u: User) => ({
      type: 'user' as const,
      id: u.id,
      title: u.name || u.email,
      thumbnail: u.avatar_url || null,
      deletedAt: u.deleted_at as string,
      daysRemaining: daysRemaining(u.deleted_at as string),
    })),
  ];

  items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  return items;
}

export async function restoreTrashItem(
  type: TrashItemType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  switch (type) {
    case 'media':
      return restoreMedia(id);
    case 'article':
      return restoreArticle(id);
    case 'user':
      return restoreUser(id);
    default:
      return { success: false, error: 'Type d\'élément inconnu' };
  }
}

export async function permanentlyDeleteTrashItem(
  type: TrashItemType,
  id: string
): Promise<{ success: boolean; error?: string }> {
  switch (type) {
    case 'media':
      return permanentlyDeleteMedia(id);
    case 'article':
      return permanentlyDeleteArticle(id);
    case 'user':
      return permanentlyDeleteUser(id);
    default:
      return { success: false, error: 'Type d\'élément inconnu' };
  }
}

// ============================================================
// 30-day auto-purge
// ============================================================
// Same lazy/throttled pattern as publishDueScheduledArticles() in
// article-service.ts, but checked from GET /api/trash (whenever an admin
// actually opens the Trash page) rather than on every public page view -
// unlike scheduled publishing, purging old trash has no user-facing
// urgency, so there's no reason to pay this check's cost on the site's
// hot path.
const PURGE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // at most once per hour
let lastPurgeCheckAt = 0;

export async function purgeExpiredTrash(): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeCheckAt < PURGE_CHECK_INTERVAL_MS) {
    return;
  }
  lastPurgeCheckAt = now;

  const cutoffIso = new Date(now - RETENTION_MS).toISOString();
  const supabase = createAdminClient();

  const [{ data: expiredMedia }, { data: expiredArticles }, { data: expiredUsers }] = await Promise.all([
    supabase.from('media').select('id').not('deleted_at', 'is', null).lt('deleted_at', cutoffIso),
    supabase.from('articles').select('id').not('deleted_at', 'is', null).lt('deleted_at', cutoffIso),
    supabase.from('users').select('id').not('deleted_at', 'is', null).lt('deleted_at', cutoffIso),
  ]);

  for (const row of expiredMedia || []) {
    await permanentlyDeleteMedia(row.id);
  }
  for (const row of expiredArticles || []) {
    await permanentlyDeleteArticle(row.id);
  }
  for (const row of expiredUsers || []) {
    await permanentlyDeleteUser(row.id);
  }

  const total = (expiredMedia?.length || 0) + (expiredArticles?.length || 0) + (expiredUsers?.length || 0);
  if (total > 0) {
  }
}
