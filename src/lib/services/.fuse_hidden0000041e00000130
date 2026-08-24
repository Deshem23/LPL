import { createAdminClient } from '@/lib/supabase/admin';
// ✅ Removed: import { createClient } from '@/lib/supabase/server';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'writer' | 'contributor';
  status: 'active' | 'inactive' | 'suspended';
  avatar_url?: string;
  bio?: string;
  role_title?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  /** True right after an admin creates this account with a temporary
   *  password - forces the first-login "change your password / complete
   *  your profile" gate (see middleware.ts) before they can reach their
   *  dashboard. Self-registered and Google OAuth accounts never set this. */
  must_change_password?: boolean;
  created_at?: string;
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = createAdminClient();
  
  console.log('🔍 Fetching all users from Supabase...');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, status, avatar_url, bio, role_title, twitter, linkedin, website, must_change_password, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching users:', error);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} users`);
  return data || [];
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Error fetching user:', error);
    return null;
  }

  return data;
}

export interface PublicAuthorProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  roleTitle?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  /** When they joined the platform (users.created_at). */
  joinedDate: string;
  /** Published articles only - a writer's drafts/review pieces aren't
   *  counted, since visitors browsing this profile can't see them anyway. */
  totalArticles: number;
  totalViews: number;
}

/**
 * Public author profile: the real user behind an article's `author_id`,
 * plus their published-article stats. Used by the public /author/[id]
 * page so clicking a byline shows the actual publishing user - not mock
 * data - regardless of their admin role (admin/editor/writer/contributor
 * can all be bylined as an article's author).
 *
 * Uses the service-role client (bypasses the "users can view their own
 * profile only" RLS policy) since this is meant to be readable by any
 * site visitor, not just the user themselves - same pattern as every
 * other *-service.ts file, only ever called from an API route or Server
 * Component (see src/lib/supabase/admin.ts).
 */
export async function getAuthorProfile(id: string): Promise<PublicAuthorProfile | null> {
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, avatar_url, bio, role_title, twitter, linkedin, website, created_at')
    .eq('id', id)
    .single();

  if (error || !user) return null;

  const { count: totalArticles } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', id)
    .eq('status', 'published');

  // No SUM() aggregate in supabase-js without an RPC - pull the
  // published articles' view counts and add them up here. Fine at
  // news-site scale; revisit with an RPC if one author's article count
  // grows very large.
  const { data: viewRows } = await supabase
    .from('articles')
    .select('view_count')
    .eq('author_id', id)
    .eq('status', 'published');

  const totalViews = (viewRows || []).reduce((sum: number, row: any) => sum + (row.view_count || 0), 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url || undefined,
    bio: user.bio || undefined,
    roleTitle: user.role_title || undefined,
    twitter: user.twitter || undefined,
    linkedin: user.linkedin || undefined,
    website: user.website || undefined,
    joinedDate: user.created_at,
    totalArticles: totalArticles || 0,
    totalViews,
  };
}

export async function getActiveUsers(): Promise<User[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, status, avatar_url, bio')
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching active users:', error);
    return [];
  }

  return data || [];
}

export interface CreateUserData {
  email: string;
  /** The generic/temporary password the admin sets for this account. The
   *  user is forced to change it on first login (see middleware.ts). */
  password: string;
  name: string;
  role: string;
  // Author profile fields - shown on the public /author/[id] page, so an
  // admin can fill these in right away instead of leaving every new
  // author's public byline blank until they log in and do it themselves.
  bio?: string;
  role_title?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  avatar_url?: string;
}

export async function createUser(userData: CreateUserData): Promise<{ success: boolean; error?: string; user?: any }> {
  console.log('👤 Creating user with data:', {
    email: userData.email,
    name: userData.name,
    role: userData.role
  });

  try {
    // ✅ Use admin client for auth operations (safe for client components)
    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role || 'contributor',
        },
      },
    });

    if (error) {
      console.error('❌ Auth error:', error);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No user returned from auth' };
    }

    console.log('✅ User created in auth:', data.user.id);

    await new Promise(resolve => setTimeout(resolve, 500));

    // The on_auth_user_created DB trigger (migrations/01_create_tables.sql)
    // already inserts a bare public.users row (id/email/name/role) right
    // after signUp() - it doesn't know about the author-profile fields or
    // must_change_password, so those get filled in with a follow-up
    // update here regardless of whether the trigger's insert landed yet
    // (the manual-insert fallback below covers the rare case it didn't).
    const authorFields = {
      bio: userData.bio || null,
      role_title: userData.role_title || null,
      twitter: userData.twitter || null,
      linkedin: userData.linkedin || null,
      website: userData.website || null,
      avatar_url: userData.avatar_url || null,
      // Admin set this password by hand (a generic/temporary one) - the
      // user must change it before reaching their dashboard.
      must_change_password: true,
    };

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profileData) {
      console.warn('⚠️ User not found in public.users, inserting manually...');

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role || 'contributor',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...authorFields,
        });

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        return { success: false, error: 'User created but profile insert failed: ' + insertError.message };
      }

      console.log('✅ User profile inserted manually');
    } else {
      console.log('✅ User profile found in public.users - filling in author fields');

      const { error: updateError } = await supabase
        .from('users')
        .update(authorFields)
        .eq('id', data.user.id);

      if (updateError) {
        console.error('❌ Error setting author fields:', updateError);
        return { success: false, error: 'User created but profile fields could not be saved: ' + updateError.message };
      }
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('❌ Unexpected error creating user:', error);
    return { success: false, error: error.message || 'Failed to create user' };
  }
}

export interface UpdateUserData {
  name?: string;
  role?: string;
  status?: string;
  bio?: string;
  role_title?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  avatar_url?: string;
}

/**
 * Admin edit of an existing user's profile/role/status. Does not touch
 * email or password - those go through Supabase Auth directly (email
 * change needs re-verification; password reset is the user's own
 * self-service flow, see actions.ts).
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<{ success: boolean; error?: string; user?: User }> {
  const supabase = createAdminClient();

  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) row.name = data.name;
  if (data.role !== undefined) row.role = data.role;
  if (data.status !== undefined) row.status = data.status;
  if (data.bio !== undefined) row.bio = data.bio || null;
  if (data.role_title !== undefined) row.role_title = data.role_title || null;
  if (data.twitter !== undefined) row.twitter = data.twitter || null;
  if (data.linkedin !== undefined) row.linkedin = data.linkedin || null;
  if (data.website !== undefined) row.website = data.website || null;
  if (data.avatar_url !== undefined) row.avatar_url = data.avatar_url || null;

  const { data: updated, error } = await supabase.from('users').update(row).eq('id', id).select('*').single();
  if (error) {
    console.error('❌ Error updating user:', error);
    return { success: false, error: error.message };
  }

  // Keep the JWT's role claim in sync so middleware's role-based route
  // gating (which reads user_metadata.role) doesn't lag behind a role
  // change until the user's next full re-login.
  if (data.role !== undefined) {
    await supabase.auth.admin.updateUserById(id, { user_metadata: { role: data.role } }).catch((err) => {
      console.error('⚠️ Role updated in DB but auth metadata sync failed:', err);
    });
  }

  return { success: true, user: updated };
}

export interface UpdateOwnProfileData {
  name?: string;
  bio?: string;
  role_title?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  avatar_url?: string;
}

/**
 * Self-service profile update - used by the first-login "complete your
 * profile" gate and any future "edit my profile" page. Deliberately
 * excludes role/status/email: those stay admin-only (see updateUser
 * above), so a user can never grant themselves a different role just by
 * editing their own profile.
 */
export async function updateOwnProfile(
  id: string,
  data: UpdateOwnProfileData,
  clearMustChangePassword: boolean = false
): Promise<{ success: boolean; error?: string; user?: User }> {
  const supabase = createAdminClient();

  const row: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) row.name = data.name;
  if (data.bio !== undefined) row.bio = data.bio || null;
  if (data.role_title !== undefined) row.role_title = data.role_title || null;
  if (data.twitter !== undefined) row.twitter = data.twitter || null;
  if (data.linkedin !== undefined) row.linkedin = data.linkedin || null;
  if (data.website !== undefined) row.website = data.website || null;
  if (data.avatar_url !== undefined) row.avatar_url = data.avatar_url || null;
  if (clearMustChangePassword) row.must_change_password = false;

  const { data: updated, error } = await supabase.from('users').update(row).eq('id', id).select('*').single();
  if (error) {
    console.error('❌ Error updating own profile:', error);
    return { success: false, error: error.message };
  }
  return { success: true, user: updated };
}

export async function updateUserRole(userId: string, role: string): Promise<{ success: boolean; error?: string }> {
  console.log(`🔄 Updating role for user ${userId} to ${role}`);
  
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('users')
      .update({ 
        role, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error updating user role:', error);
      return { success: false, error: error.message };
    }

    // Keep the JWT's role claim in sync - same fix already applied to
    // updateUser() (used by the "Modifier" edit dialog). This function
    // backs the separate, simpler "Changer le rôle" quick action, which
    // was only ever updating the public.users row: middleware's
    // role-based route gating and this admin layout's own nav both read
    // user_metadata.role, not the DB column, so a role changed through
    // this path specifically kept granting/denying admin pages based on
    // the OLD role until the person's next full re-login.
    await supabase.auth.admin.updateUserById(userId, { user_metadata: { role } }).catch((err) => {
      console.error('⚠️ Role updated in DB but auth metadata sync failed:', err);
    });

    console.log(`✅ Role updated for user ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error updating role:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`🗑️ Deleting user ${userId}`);
  
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('❌ Error deleting user:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ User deleted: ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error deleting user:', error);
    return { success: false, error: error.message };
  }
}
