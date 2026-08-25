import { createAdminClient } from '@/lib/supabase/admin';

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  cover_image?: string;
  status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
  is_pinned: boolean;
  is_trending: boolean;
  is_suggestion: boolean;
  is_breaking: boolean;
  is_featured: boolean;
  view_count: number;
  author_id: string;
  // The single category FK. Per the actual schema (migrations/01_create_tables.sql),
  // articles only ever have category_id - there is no subcategory_id column.
  // Subcategories are just rows in the `categories` table with a non-null
  // parent_id, so an article "in a subcategory" simply has category_id
  // pointing directly at that subcategory row. See category-service.ts.
  category_id?: string;
  scheduled_publish_at?: string;
  published_at?: string;
  reading_time?: number;
  meta_description?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  author?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    bio?: string;
    role_title?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  // May be a top-level category OR a subcategory row (see category_id note
  // above); parent_id lets callers tell which and walk up to the parent.
  category?: {
    id: string;
    name: string;
    slug: string;
    parent_id?: string | null;
    // Only populated by getArticles() (the admin list), which embeds one
    // level up so the UI can show "Parent / Subcategory" without a
    // second round-trip.
    parent?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
}

export interface CreateArticleData {
  title: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  cover_image?: string;
  status?: 'draft' | 'review' | 'scheduled' | 'published';
  is_pinned?: boolean;
  is_trending?: boolean;
  is_suggestion?: boolean;
  is_breaking?: boolean;
  is_featured?: boolean;
  author_id: string;
  // Pass the subcategory's id here (not the parent's) when the article
  // belongs to a subcategory - see the Article.category_id note above.
  category_id?: string;
  scheduled_publish_at?: string;
  meta_description?: string;
  tags?: string[];
  // Optional backdate. created_at is what the public site actually
  // displays/sorts/filters by everywhere (mapDbArticle's `createdAt`,
  // the Archives page's calendar filter, list ordering), so this is the
  // field that matters for "make this look like it was published on a
  // past date". published_at is also exposed so it can be kept in sync
  // with the same date when the article is being created/saved as
  // published, rather than staying stamped to the moment it was saved.
  // Left undefined, both behave exactly as before (created_at defaults
  // to now via the DB column default, published_at stamps to now on
  // publish).
  created_at?: string;
  published_at?: string;
}

// There's no real cron/scheduler in this app (a static SQL migration or a
// deployed cron job would be needed for that) - instead, every read path
// below lazily flips any 'scheduled' article whose scheduled_publish_at
// has passed to 'published' right before querying. This is what makes a
// scheduled article "publish itself at the programmed time": the first
// page load (public or admin) after that time passes is what does it.
//
// getArticles() (called from nearly every single page - home, every
// category/subcategory, tags, the admin article list, the sitemap, the
// content calendar...) awaits this before its own query, which means
// this UPDATE ran as an extra, unconditional database round-trip on
// almost every page view of the site - even though it almost always
// finds zero scheduled articles due. Throttled to run at most once per
// SCHEDULED_PUBLISH_CHECK_INTERVAL_MS: a scheduled article can now take
// up to that long (worst case) to actually go live after its scheduled
// time instead of the very next page load, which is an irrelevant delay
// for a "publish this at 9am" style feature, in exchange for skipping
// this round-trip on the overwhelming majority of requests.
const SCHEDULED_PUBLISH_CHECK_INTERVAL_MS = 60 * 1000;
let lastScheduledPublishCheckAt = 0;

export async function publishDueScheduledArticles(): Promise<void> {
  const now = Date.now();
  if (now - lastScheduledPublishCheckAt < SCHEDULED_PUBLISH_CHECK_INTERVAL_MS) {
    return;
  }
  lastScheduledPublishCheckAt = now;

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('articles')
    .update({ status: 'published', published_at: nowIso })
    .eq('status', 'scheduled')
    .lte('scheduled_publish_at', nowIso)
    .select('id');

  if (error) {
    console.error('Error auto-publishing scheduled articles:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log(`⏰ Auto-published ${data.length} scheduled article(s) whose time has come`);
  }
}

export async function getArticles(params: {
  locale?: string;
  page?: number;
  limit?: number;
  /** @deprecated fragile embedded-filter on category.slug - use categoryIds instead */
  category?: string;
  /** Filter to articles whose category_id is in this set (a category id,
   * a subcategory id, or - for "category page shows its subcategories
   * too" - a category id plus all its children's ids). Resolve slugs to
   * ids via category-service.ts before calling this. */
  categoryIds?: string[];
  search?: string;
  /** 'YYYY-MM-DD' - filter to articles created on this calendar day. */
  date?: string;
  breaking?: boolean;
  status?: string;
  author_id?: string;
}): Promise<{ articles: Article[]; total: number; totalPages: number; currentPage: number }> {
  await publishDueScheduledArticles();

  const supabase = createAdminClient();

  const page = params.page || 1;
  const limit = params.limit || 100;
  const offset = (page - 1) * limit;

  console.log('🔍 getArticles called with params:', JSON.stringify(params, null, 2));

  let query = supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug,
        parent_id,
        parent:parent_id (
          id,
          name,
          slug
        )
      )
    `, { count: 'exact' });

  // Excludes trashed articles (see deleteArticle()/restoreArticle() below)
  // from every normal listing - the admin list, the homepage, category
  // pages, the sitemap, all of it. Trashed articles are only ever
  // returned by getTrashedArticles().
  query = query.is('deleted_at', null);

  // Apply status filter - FIXED!
  if (params.status && params.status !== 'all') {
    console.log(`📊 Filtering by status: ${params.status}`);
    query = query.eq('status', params.status);
  } else {
    console.log('📊 Showing ALL articles (no status filter)');
    // Don't filter - show all statuses
  }

  // Apply other filters
  if (params.categoryIds && params.categoryIds.length > 0) {
    query = query.in('category_id', params.categoryIds);
  }

  if (params.author_id) {
    query = query.eq('author_id', params.author_id);
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,excerpt.ilike.%${params.search}%`);
  }

  if (params.date) {
    // params.date is a plain 'YYYY-MM-DD' string (from a date input) -
    // match anything published that calendar day.
    const start = `${params.date}T00:00:00.000Z`;
    const end = `${params.date}T23:59:59.999Z`;
    query = query.gte('created_at', start).lte('created_at', end);
  }

  if (params.breaking) {
    query = query.eq('is_breaking', true);
  }

  // Order by: pinned first, then published_at, then created_at
  query = query
    .order('is_pinned', { ascending: false })
    // nullsFirst: false == nulls last (the supabase-js types only expose
    // nullsFirst, not nullsLast - the same value flipped).
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching articles:', error);
    return { articles: [], total: 0, totalPages: 0, currentPage: page };
  }

  const articles = data || [];
  const total = count || 0;

  console.log(`✅ Found ${total} articles (returning ${articles.length})`);

  return {
    articles,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug,
        parent_id
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching article:', error);
    return null;
  }

  return data;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  await publishDueScheduledArticles();

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug,
        parent_id
      )
    `)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching article:', error);
    return null;
  }

  return data;
}

export async function createArticle(data: CreateArticleData): Promise<{ success: boolean; error?: string; article?: Article }> {
  const supabase = createAdminClient();
  
  console.log('📝 Creating article with data:', JSON.stringify(data, null, 2));
  
  if (!data.title) {
    return { success: false, error: 'Title is required' };
  }
  if (!data.content) {
    return { success: false, error: 'Content is required' };
  }
  if (!data.author_id) {
    return { success: false, error: 'Author ID is required' };
  }

  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const wordCount = data.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  const articleData = {
    title: data.title,
    excerpt: data.excerpt || '',
    content: data.content,
    slug,
    status: data.status || 'draft',
    author_id: data.author_id,
    category_id: data.category_id || null,
    is_pinned: data.is_pinned || false,
    is_trending: data.is_trending || false,
    is_suggestion: data.is_suggestion || false,
    is_breaking: data.is_breaking || false,
    is_featured: data.is_featured || false,
    featured_image: data.featured_image || data.cover_image || null,
    scheduled_publish_at: data.scheduled_publish_at || null,
    // A caller-supplied backdate wins over "now" for both fields - see
    // the CreateArticleData comment above. created_at is always set
    // explicitly (instead of leaving it to the DB column's now() default)
    // so a backdated value and the normal case go through the exact same
    // code path.
    created_at: data.created_at || new Date().toISOString(),
    published_at: data.status === 'published' ? (data.published_at || data.created_at || new Date().toISOString()) : null,
    meta_description: data.meta_description || null,
    tags: data.tags || [],
    reading_time: readingTime,
    view_count: 0,
  };

  console.log('📤 Sending to Supabase:', JSON.stringify(articleData, null, 2));

  const { data: article, error } = await supabase
    .from('articles')
    .insert([articleData])
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug,
        parent_id
      )
    `)
    .single();

  if (error) {
    console.error('❌ Error creating article:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Article created:', article.id);
  return { success: true, article };
}

export async function updateArticle(id: string, data: Partial<CreateArticleData>): Promise<{ success: boolean; error?: string; article?: Article }> {
  const supabase = createAdminClient();
  
  console.log('📝 Updating article:', id);
  
  const updateData: any = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Only auto-stamp "now" when the caller didn't already provide an
  // explicit published_at/created_at (a backdate) - previously this
  // unconditionally overwrote published_at, so saving an edit on a
  // backdated article (e.g. just fixing a typo) would silently reset its
  // date back to today.
  if (data.status === 'published' && !data.scheduled_publish_at && !data.published_at && !data.created_at) {
    updateData.published_at = new Date().toISOString();
  } else if (data.status === 'published' && data.created_at && !data.published_at) {
    updateData.published_at = data.created_at;
  }

  if (data.title) {
    updateData.slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  if (data.content) {
    const wordCount = data.content.split(/\s+/).length;
    updateData.reading_time = Math.ceil(wordCount / 200);
  }

  const { data: article, error } = await supabase
    .from('articles')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug,
        parent_id
      )
    `)
    .single();

  if (error) {
    console.error('❌ Error updating article:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Article updated:', article.id);
  return { success: true, article };
}

// Soft delete - moves the article to the trash (see migrations/20_recycle_bin_and_media_dedup.sql)
// instead of removing the row. Every normal read path above filters
// `.is('deleted_at', null)`, so a trashed article immediately disappears
// from the admin list, the homepage, category pages, the sitemap, etc.,
// while still existing in the DB until it's restored or the 30-day
// auto-purge (see purgeExpiredTrash() below) permanently removes it.
export async function deleteArticle(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  console.log('🗑️ Moving article to trash:', id);

  const { error } = await supabase
    .from('articles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('❌ Error trashing article:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Article moved to trash:', id);
  return { success: true };
}

export async function restoreArticle(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  console.log('♻️ Restoring article from trash:', id);

  const { error } = await supabase
    .from('articles')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) {
    console.error('❌ Error restoring article:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Article restored:', id);
  return { success: true };
}

// The real, irreversible DELETE - only ever reached from the trash view
// (an explicit "Delete permanently" action) or from purgeExpiredTrash()
// below once an item has been trashed for 30+ days.
export async function permanentlyDeleteArticle(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  console.log('🗑️ Permanently deleting article:', id);

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Error permanently deleting article:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Article permanently deleted:', id);
  return { success: true };
}

export async function getTrashedArticles(): Promise<Article[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching trashed articles:', error);
    return [];
  }

  return data || [];
}

export async function incrementViewCount(id: string): Promise<void> {
  const supabase = createAdminClient();

  // Atomic UPDATE via RPC (see migrations/18_atomic_counters.sql) - the
  // previous select-then-update here could lose a concurrent increment
  // when two requests for the same article overlapped.
  const { error } = await supabase.rpc('increment_article_view_count', {
    article_id: id,
  });

  if (error) {
    console.error('Error incrementing view count:', error);
  }
}

export async function getTrendingArticles(limit: number = 5): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .eq('is_trending', true)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('view_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending articles:', error);
    return [];
  }

  return data || [];
}

export async function getFeaturedArticles(limit: number = 6): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .eq('is_featured', true)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured articles:', error);
    return [];
  }

  return data || [];
}

export async function getBreakingArticles(limit: number = 5): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .eq('is_breaking', true)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching breaking articles:', error);
    return [];
  }

  return data || [];
}

export async function getArticlesByAuthor(authorId: string, limit: number = 10): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      category:category_id (
        id,
        name,
        slug,
        parent_id
      )
    `)
    .eq('author_id', authorId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching author articles:', error);
    return [];
  }

  return data || [];
}

export async function getPinnedArticles(limit: number = 4): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .eq('is_pinned', true)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching pinned articles:', error);
    return [];
  }

  return data || [];
}

export async function getSuggestedArticles(limit: number = 6): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .eq('is_suggestion', true)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching suggested articles:', error);
    return [];
  }

  return data || [];
}

export async function getRelatedArticles(articleId: string, categoryId: string, limit: number = 4): Promise<Article[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:author_id (
        id,
        name,
        email,
        avatar_url,
        bio,
        role_title,
        twitter,
        linkedin,
        website
      ),
      category:category_id (
        id,
        name,
        slug
      )
    `)
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .neq('id', articleId)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }

  return data || [];
}
