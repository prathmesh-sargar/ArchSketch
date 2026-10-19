-- ArchSketch Database Schema & Team Collaboration Setup
-- Migration: 20261018000000_archsketch_schema.sql

-- 1. Profiles Table (mirrors auth.users for display names and avatars)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ArchSketch Projects Canvas Table
CREATE TABLE IF NOT EXISTS public.archsketch_projects (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- backwards compatible alias
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Team Collaboration Memberships
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES public.archsketch_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- 4. Project Snapshot Versions (for easy undo/history for teams)
CREATE TABLE IF NOT EXISTS public.project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES public.archsketch_projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version_name TEXT NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Auto-sync trigger for new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archsketch_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Profiles
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Projects
CREATE POLICY "Users can view projects they own or belong to or public"
  ON public.archsketch_projects FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR user_id = auth.uid()
    OR is_public = true
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create their own projects"
  ON public.archsketch_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid() OR user_id = auth.uid() OR owner_id IS NULL
  );

CREATE POLICY "Users can update projects they own or have editor rights"
  ON public.archsketch_projects FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR user_id = auth.uid()
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
  );

CREATE POLICY "Users can delete projects they own"
  ON public.archsketch_projects FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid() OR user_id = auth.uid()
  );

-- Project Members
CREATE POLICY "Members viewable by project participants"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT id FROM public.archsketch_projects WHERE owner_id = auth.uid() OR user_id = auth.uid())
  );

-- Project Versions
CREATE POLICY "Versions viewable by project participants"
  ON public.project_versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.archsketch_projects 
      WHERE owner_id = auth.uid() OR user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "Versions insertable by project editors"
  ON public.project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.archsketch_projects 
      WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );
