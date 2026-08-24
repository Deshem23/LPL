-- ============================================
-- RBAC: COMPLETE PERMISSIONS SYSTEM
-- ============================================

-- ============================================
-- 1. CREATE PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'writer', 'contributor')),
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- ============================================
-- 3. CREATE ARTICLE_STATUS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS article_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  can_transition_to TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. INSERT DEFAULT ARTICLE STATUSES
-- ============================================
INSERT INTO article_status (name, slug, description, can_transition_to) VALUES
  ('Draft', 'draft', 'Initial draft state', ARRAY['review', 'published', 'archived']),
  ('Review', 'review', 'Submitted for review', ARRAY['published', 'draft', 'archived']),
  ('Scheduled', 'scheduled', 'Scheduled for future publication', ARRAY['published', 'draft']),
  ('Published', 'published', 'Published and live', ARRAY['archived']),
  ('Archived', 'archived', 'Archived content', ARRAY['published'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. INSERT PERMISSIONS
-- ============================================
INSERT INTO permissions (name, resource, action, description) VALUES
  -- Article permissions
  ('articles:create', 'articles', 'create', 'Can create articles'),
  ('articles:read:all', 'articles', 'read:all', 'Can read all articles'),
  ('articles:read:own', 'articles', 'read:own', 'Can read own articles'),
  ('articles:update:own', 'articles', 'update:own', 'Can update own articles'),
  ('articles:update:all', 'articles', 'update:all', 'Can update all articles'),
  ('articles:publish:own', 'articles', 'publish:own', 'Can publish own articles'),
  ('articles:publish:all', 'articles', 'publish:all', 'Can publish any articles'),
  ('articles:delete', 'articles', 'delete', 'Can delete articles'),
  ('articles:schedule', 'articles', 'schedule', 'Can schedule articles'),
  ('articles:review', 'articles', 'review', 'Can review articles'),
  ('articles:approve', 'articles', 'approve', 'Can approve/reject articles'),
  
  -- Category permissions
  ('categories:manage', 'categories', 'manage', 'Can manage categories'),
  ('categories:assign', 'categories', 'assign', 'Can assign categories to articles'),
  
  -- Media permissions
  ('media:upload', 'media', 'upload', 'Can upload media'),
  ('media:manage:all', 'media', 'manage:all', 'Can manage all media'),
  ('media:delete', 'media', 'delete', 'Can delete media'),
  
  -- User permissions
  ('users:manage', 'users', 'manage', 'Can manage users'),
  ('users:manage:roles', 'users', 'manage:roles', 'Can manage user roles'),
  
  -- Admin permissions
  ('admin:access', 'admin', 'access', 'Can access admin panel'),
  ('settings:manage', 'settings', 'manage', 'Can manage settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- Admin: ALL permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Editor: Content management + review
INSERT INTO role_permissions (role, permission_id)
SELECT 'editor', id FROM permissions 
WHERE name IN (
  'articles:create', 
  'articles:read:all', 
  'articles:update:all',
  'articles:publish:all',
  'articles:delete', 
  'articles:review',
  'articles:approve', 
  'articles:schedule',
  'categories:assign', 
  'media:upload', 
  'media:manage:all',
  'admin:access'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Writer: Create and manage own articles + media
INSERT INTO role_permissions (role, permission_id)
SELECT 'writer', id FROM permissions 
WHERE name IN (
  'articles:create', 
  'articles:read:own', 
  'articles:update:own',
  'articles:publish:own',
  'articles:schedule', 
  'categories:assign', 
  'media:upload',
  'admin:access'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Contributor: Submit articles only
INSERT INTO role_permissions (role, permission_id)
SELECT 'contributor', id FROM permissions 
WHERE name IN (
  'articles:create', 
  'articles:read:own',
  'admin:access'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================
-- 7. VERIFY EVERYTHING
-- ============================================

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('permissions', 'role_permissions', 'article_status');

-- Check permissions count
SELECT COUNT(*) as total_permissions FROM permissions;

-- Check role permissions
SELECT role, COUNT(*) as permission_count 
FROM role_permissions 
GROUP BY role 
ORDER BY role;

-- Show permissions per role
SELECT 
  rp.role,
  p.name as permission
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
ORDER BY rp.role, p.name;
