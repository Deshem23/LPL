// Real Supabase-backed ad service. Replaces the old 100%-mock version.
// Like article-service.ts / category-service.ts, this uses the
// service-role client and must only ever be called from server-side code
// (Route Handlers, Server Components) - never directly from a
// 'use client' component. See src/lib/supabase/admin.ts for why.

import { createAdminClient } from '@/lib/supabase/admin';
import { Ad, AdPlacement } from '@/lib/types/ad';

// Fixed catalog of placement slots the UI knows how to render. These are
// not stored in the DB (there's no admin need to add new physical slots
// without a code change), but maxAds/isActive here govern how many ads
// getAdsByPlacement() will return for a given spot.
const AD_PLACEMENTS: AdPlacement[] = [
  { id: 'sidebar', name: 'Sidebar', description: 'Encart dans la barre latérale', size: { width: 300, height: 600 }, positions: ['all'], maxAds: 3, isActive: true, supportsTextOnly: true },
  { id: 'in-article', name: 'Dans l’article', description: 'Encart au fil du contenu', size: { width: 728, height: 90 }, positions: ['article'], maxAds: 2, isActive: true, supportsTextOnly: true },
  { id: 'ticker', name: 'Bandeau Annonce', description: 'Bandeau défilant sous le header (texte uniquement)', size: { width: 1200, height: 40 }, positions: ['all'], maxAds: 10, isActive: true, supportsTextOnly: true },
  // top/middle/bottom/footer intentionally removed: no component on the
  // site requests them, so an ad assigned to one was invisible. Add a
  // real slot for one (see AdComponent usages) before reintroducing it
  // as a selectable placement in ad-form.tsx.
];

function mapRow(row: any): Ad {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    imageUrl: row.image_url || undefined,
    images: Array.isArray(row.images) ? row.images : [],
    media: Array.isArray(row.media) ? row.media : [],
    linkUrl: row.link_url || undefined,
    type: row.type,
    placement: row.placement,
    status: row.status,
    views: row.view_count || 0,
    clicks: row.click_count || 0,
    ctr: row.view_count ? Math.round(((row.click_count || 0) / row.view_count) * 1000) / 10 : 0,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    priority: row.priority || 0,
    isTextOnly: !!row.is_text_only,
    textContent: row.text_content || undefined,
    backgroundColor: row.background_color || undefined,
    textColor: row.text_color || undefined,
    buttonText: row.button_text || undefined,
    sponsorName: row.sponsor_name || undefined,
  };
}

function toRow(data: Partial<Ad>): Record<string, any> {
  const row: Record<string, any> = {};
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description || null;
  if (data.imageUrl !== undefined) row.image_url = data.imageUrl || null;
  if (data.images !== undefined) row.images = data.images || [];
  if (data.media !== undefined) row.media = data.media || [];
  if (data.linkUrl !== undefined) row.link_url = data.linkUrl;
  if (data.type !== undefined) row.type = data.type;
  if (data.placement !== undefined) row.placement = data.placement;
  if (data.status !== undefined) row.status = data.status;
  if (data.isTextOnly !== undefined) row.is_text_only = data.isTextOnly;
  if (data.textContent !== undefined) row.text_content = data.textContent || null;
  if (data.sponsorName !== undefined) row.sponsor_name = data.sponsorName || null;
  if (data.buttonText !== undefined) row.button_text = data.buttonText || null;
  if (data.backgroundColor !== undefined) row.background_color = data.backgroundColor || null;
  if (data.textColor !== undefined) row.text_color = data.textColor || null;
  if (data.priority !== undefined) row.priority = data.priority;
  if (data.startDate !== undefined) row.start_date = data.startDate || null;
  if (data.endDate !== undefined) row.end_date = data.endDate || null;
  return row;
}

export async function getAds(params?: {
  status?: string;
  type?: string;
  placement?: string;
  textOnly?: boolean;
}): Promise<Ad[]> {
  const supabase = createAdminClient();
  let query = supabase.from('ads').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false });

  if (params?.status) query = query.eq('status', params.status);
  if (params?.type) query = query.eq('type', params.type);
  if (params?.placement) query = query.eq('placement', params.placement);
  if (params?.textOnly !== undefined) query = query.eq('is_text_only', params.textOnly);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching ads:', error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function getAd(id: string): Promise<Ad | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('ads').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapRow(data);
}

// Guards against the exact bug that used to bloat this table: an ad's
// image saved as a base64 `data:` URI directly in image_url/images/media
// instead of a Supabase Storage URL (see ad-form.tsx and
// fix-ad-media.mjs for the full story - a single photo easily became
// 500KB-2MB once base64-encoded, and getAdsByPlacement() selects every
// column for every ad on nearly every page, which broke Next's response
// cache outright and added multi-second, uncacheable DB reads to almost
// every page load). The admin form no longer generates these, but
// nothing stopped a future form, a direct API call, or a copy-pasted
// value from reintroducing them - this check lives at the actual
// database-write boundary (not just in the form or the route handler) so
// it can't be bypassed by any caller, present or future. Returns the
// offending field name, or null if nothing's wrong.
function findInlineMediaField(data: Partial<Ad>): string | null {
  const isDataUri = (v: unknown) => typeof v === 'string' && v.startsWith('data:');
  if (isDataUri(data.imageUrl)) return 'imageUrl';
  if (Array.isArray(data.images) && data.images.some(isDataUri)) return 'images';
  if (Array.isArray(data.media) && data.media.some((m) => m && isDataUri((m as any).url))) return 'media';
  return null;
}

export async function createAd(data: Partial<Ad>): Promise<{ success: boolean; error?: string; ad?: Ad }> {
  if (!data.title) return { success: false, error: 'Title is required' };
  if (!data.linkUrl) return { success: false, error: 'Destination URL is required' };

  const inlineMediaField = findInlineMediaField(data);
  if (inlineMediaField) {
    return {
      success: false,
      error: `Le champ "${inlineMediaField}" contient une image encodée en base64 au lieu d'une URL. Téléversez l'image via le sélecteur de médias plutôt que de l'intégrer directement.`,
    };
  }

  const supabase = createAdminClient();
  const row = {
    ...toRow(data),
    title: data.title,
    link_url: data.linkUrl,
    type: data.type || 'banner',
    placement: data.placement || 'top',
    status: data.status || 'inactive',
    is_text_only: data.isTextOnly || false,
    priority: data.priority || 0,
    view_count: 0,
    click_count: 0,
  };

  const { data: inserted, error } = await supabase.from('ads').insert([row]).select('*').single();
  if (error) {
    console.error('Error creating ad:', error);
    return { success: false, error: error.message };
  }
  return { success: true, ad: mapRow(inserted) };
}

export async function updateAd(id: string, data: Partial<Ad>): Promise<{ success: boolean; error?: string; ad?: Ad }> {
  const inlineMediaField = findInlineMediaField(data);
  if (inlineMediaField) {
    return {
      success: false,
      error: `Le champ "${inlineMediaField}" contient une image encodée en base64 au lieu d'une URL. Téléversez l'image via le sélecteur de médias plutôt que de l'intégrer directement.`,
    };
  }

  const supabase = createAdminClient();
  const row = { ...toRow(data), updated_at: new Date().toISOString() };

  const { data: updated, error } = await supabase.from('ads').update(row).eq('id', id).select('*').single();
  if (error) {
    console.error('Error updating ad:', error);
    return { success: false, error: error.message };
  }
  return { success: true, ad: mapRow(updated) };
}

export async function deleteAd(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('ads').delete().eq('id', id);
  if (error) {
    console.error('Error deleting ad:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getAdPlacements(): Promise<AdPlacement[]> {
  return AD_PLACEMENTS;
}

/**
 * Public-facing: active ads for a given placement, within their
 * start/end date window if set, highest priority first, capped to the
 * placement's maxAds. Used by /api/public/ads so a 'use client' ad slot
 * never needs the service-role client directly.
 */
export async function getAdsByPlacement(placement: string): Promise<Ad[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const placementConfig = AD_PLACEMENTS.find((p) => p.id === placement);
  const maxAds = placementConfig?.maxAds || 1;

  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('placement', placement)
    .eq('status', 'active')
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(maxAds);

  if (error) {
    console.error('Error fetching ads by placement:', error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function trackAdView(id: string): Promise<void> {
  const supabase = createAdminClient();
  // Atomic UPDATE via RPC (see migrations/18_atomic_counters.sql) - the
  // previous select-then-update here could lose a concurrent increment
  // when two requests for the same ad overlapped.
  const { error } = await supabase.rpc('increment_ad_view_count', { ad_id: id });
  if (error) {
    console.error('Error incrementing ad view count:', error);
  }
}

export async function trackAdClick(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('increment_ad_click_count', { ad_id: id });
  if (error) {
    console.error('Error incrementing ad click count:', error);
  }
}
