-- ============================================
-- LES PAGES LIBRES - DATABASE SCHEMA
-- ============================================
-- This migration creates all tables in the correct order
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CATEGORIES TABLE (First - no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Categories are viewable by everyone" 
  ON categories FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage categories" 
  ON categories FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Add some default categories
INSERT INTO categories (name, slug, description, order_index) VALUES
  ('Économie', 'economie', 'Actualités économiques et financières', 1),
  ('Politique', 'politique', 'Actualités politiques nationales et internationales', 2),
  ('Société', 'societe', 'Faits de société et actualités sociales', 3),
  ('Santé', 'sante', 'Actualités sur la santé et le bien-être', 4),
  ('International', 'international', 'Actualités internationales', 5),
  ('Technologie', 'technologie', 'Actualités technologiques et innovations', 6),
  ('Sport', 'sport', 'Actualités sportives', 7),
  ('Insolite', 'insolite', 'Curiosités et faits insolites', 8),
  ('Culture', 'culture', 'Actualités culturelles et artistiques', 9),
  ('Environnement', 'environnement', 'Actualités sur l''environnement', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('admin', 'editor', 'writer', 'contributor')),
  bio TEXT,
  role_title TEXT,
  twitter TEXT,
  linkedin TEXT,
  website TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" 
  ON users FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update all users" 
  ON users FOR UPDATE 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can update their own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can delete users" 
  ON users FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 3. ARTICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  cover_image TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'scheduled', 'published', 'archived')),
  is_pinned BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  is_suggestion BOOLEAN DEFAULT false,
  is_breaking BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reading_time INTEGER,
  meta_description TEXT
);

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create policies for articles
CREATE POLICY "Published articles are viewable by everyone" 
  ON articles FOR SELECT 
  USING (status = 'published');

CREATE POLICY "Authors can view their own articles" 
  ON articles FOR SELECT 
  USING (auth.uid() = author_id);

CREATE POLICY "Admins and editors can view all articles" 
  ON articles FOR SELECT 
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

CREATE POLICY "Authors can create articles" 
  ON articles FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update their own drafts" 
  ON articles FOR UPDATE 
  USING (auth.uid() = author_id AND status IN ('draft', 'review'));

CREATE POLICY "Admins and editors can update any article" 
  ON articles FOR UPDATE 
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

CREATE POLICY "Admins can delete articles" 
  ON articles FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 4. ARTICLE TRANSLATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  language_code TEXT CHECK (language_code IN ('fr', 'en', 'ht')),
  title TEXT,
  excerpt TEXT,
  content TEXT,
  slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, language_code)
);

-- Enable Row Level Security
ALTER TABLE article_translations ENABLE ROW LEVEL SECURITY;

-- Create policies for translations
CREATE POLICY "Translations are viewable by everyone" 
  ON article_translations FOR SELECT 
  USING (true);

CREATE POLICY "Admins and editors can manage translations" 
  ON article_translations FOR ALL 
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

-- ============================================
-- 5. MEDIA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image' CHECK (type IN ('image', 'video', 'audio', 'gallery', 'podcast')),
  alt_text TEXT,
  caption TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Enable Row Level Security
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Create policies for media
CREATE POLICY "Media is viewable by everyone" 
  ON media FOR SELECT 
  USING (true);

CREATE POLICY "Admins and editors can upload media" 
  ON media FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'editor', 'writer'));

CREATE POLICY "Admins can delete media" 
  ON media FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 6. ADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  type TEXT DEFAULT 'banner' CHECK (type IN ('banner', 'sidebar', 'in-article', 'popup', 'video', 'text', 'sponsored', 'link')),
  placement TEXT DEFAULT 'sidebar' CHECK (placement IN ('top', 'middle', 'bottom', 'sidebar', 'in-article', 'footer')),
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'scheduled')),
  is_text_only BOOLEAN DEFAULT false,
  text_content TEXT,
  sponsor_name TEXT,
  button_text TEXT,
  background_color TEXT,
  text_color TEXT,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Create policies for ads
CREATE POLICY "Ads are viewable by everyone" 
  ON ads FOR SELECT 
  USING (status = 'active');

CREATE POLICY "Admins and editors can manage ads" 
  ON ads FOR ALL 
  USING (auth.jwt() ->> 'role' IN ('admin', 'editor'));

-- ============================================
-- 7. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Only admins can view audit logs" 
  ON audit_logs FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can insert audit logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 8. AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'contributor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 9. UPDATE TIMESTAMP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ads_updated_at ON ads;
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================
-- Run these to verify everything is created correctly
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Expected tables:
-- ✅ categories
-- ✅ users
-- ✅ articles
-- ✅ article_translations
-- ✅ media
-- ✅ ads
-- ✅ audit_logs
