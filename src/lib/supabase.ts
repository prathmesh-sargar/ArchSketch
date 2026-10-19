import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';

export interface CloudProject {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  user_id?: string;
  updated_at?: string;
}

// Local storage keys for offline-first resilience
const STORAGE_KEY_CONFIG = 'archsketch_supabase_config_v1';
const STORAGE_KEY_PROJECTS = 'archsketch_projects_v2';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse error
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  supabaseInstance = null; // Reset cached client
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSavedSupabaseConfig();
  if (url && anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return null;
}

// Save projects locally (Offline-First Guarantee)
export function saveLocalProjects(projects: CloudProject[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Load projects from localStorage
export function loadLocalProjects(): CloudProject[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
  }
  return null;
}

// Cloud Database Sync: Push to Supabase PostgreSQL table 'archsketch_projects'
export async function syncProjectToCloud(project: CloudProject, user: User | null): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }
  if (!user) {
    return { success: false, error: 'You must be signed in to sync to cloud.' };
  }

  try {
    // Include both user_id and owner_id to satisfy all schema variants and RLS policies
    const payload: Record<string, unknown> = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      nodes: project.nodes,
      edges: project.edges,
      user_id: user.id,
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    };

    let { error } = await client
      .from('archsketch_projects')
      .upsert(payload, { onConflict: 'id' });

    // If owner_id column does not exist in older table, retry without owner_id
    if (error && (error.message.includes('owner_id') || error.code === '42703')) {
      delete payload.owner_id;
      const retry = await client
        .from('archsketch_projects')
        .upsert(payload, { onConflict: 'id' });
      error = retry.error;
    }

    // If user_id column does not exist in older table, retry with only owner_id
    if (error && (error.message.includes('user_id') || error.code === '42703')) {
      delete payload.user_id;
      payload.owner_id = user.id;
      const retry = await client
        .from('archsketch_projects')
        .upsert(payload, { onConflict: 'id' });
      error = retry.error;
    }

    if (error) {
      console.error('Supabase sync error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown sync error' };
  }
}

// Cloud Database Sync: Delete project from Supabase
export async function deleteProjectFromCloud(projectId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { error } = await client
      .from('archsketch_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown delete error' };
  }
}

// Cloud Database Sync: Pull all projects for current user from Supabase
export async function fetchProjectsFromCloud(user: User | null): Promise<{ projects?: CloudProject[]; error?: string }> {
  const client = getSupabase();
  if (!client || !user) {
    return { projects: [] };
  }

  try {
    // Select all projects. With RLS enabled, Supabase filters rows visible to authenticated user.
    const { data, error } = await client
      .from('archsketch_projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return { error: error.message };
    }

    // Filter projects matching this user
    const userProjects = (data || []).filter((p: Record<string, unknown>) => {
      if (p.user_id && p.user_id === user.id) return true;
      if (p.owner_id && p.owner_id === user.id) return true;
      if (!p.user_id && !p.owner_id) return true;
      return false;
    });

    return { projects: userProjects as CloudProject[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown fetch error' };
  }
}

// Sign in using OAuth provider (GitHub or Google)
export async function signInWithOAuthProvider(provider: 'github' | 'google') {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: { message: 'Supabase client is not configured yet.' } };
  }
  return client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
}

// Subscribe to real-time auth state changes
export function onAuthChange(callback: (user: User | null) => void) {
  const client = getSupabase();
  if (!client) return { unsubscribe: () => {} };

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return subscription;
}

// The exact SQL migration script users can run in Supabase SQL editor
export const SUPABASE_SQL_MIGRATION = `-- ArchSketch Database Schema & Team Collaboration
-- Run this in your Supabase Dashboard > SQL Editor:

-- 1. Profiles Table (linked to auth.users)
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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 4. Auto-create Profile on Signup Trigger
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

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archsketch_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 6. Zero-Recursion RLS Policies (Safe, direct owner & user check without circular subqueries)
DROP POLICY IF EXISTS "View projects access" ON public.archsketch_projects;
DROP POLICY IF EXISTS "Insert projects access" ON public.archsketch_projects;
DROP POLICY IF EXISTS "Update projects access" ON public.archsketch_projects;
DROP POLICY IF EXISTS "Delete projects access" ON public.archsketch_projects;
DROP POLICY IF EXISTS "Users can only access their own projects" ON public.archsketch_projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.archsketch_projects;
DROP POLICY IF EXISTS "archsketch_projects_user_access" ON public.archsketch_projects;

CREATE POLICY "archsketch_projects_user_access"
  ON public.archsketch_projects
  FOR ALL
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR user_id = auth.uid() 
    OR is_public = true
  )
  WITH CHECK (
    owner_id = auth.uid() 
    OR user_id = auth.uid()
  );

-- 7. User Feedback & Bug Reports Table
CREATE TABLE IF NOT EXISTS public.archsketch_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.archsketch_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archsketch_feedback_insert" ON public.archsketch_feedback;
DROP POLICY IF EXISTS "archsketch_feedback_select" ON public.archsketch_feedback;
DROP POLICY IF EXISTS "archsketch_feedback_manage" ON public.archsketch_feedback;

CREATE POLICY "archsketch_feedback_insert"
  ON public.archsketch_feedback
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "archsketch_feedback_select"
  ON public.archsketch_feedback
  FOR SELECT
  USING (true);

CREATE POLICY "archsketch_feedback_manage"
  ON public.archsketch_feedback
  FOR ALL
  USING (true);
`;

// Admin Account Identification
export const ADMIN_CONFIG = {
  emails: ['sargarprathmesh007@gmail.com'],
  ids: ['0cc58ebe-1983-4ffa-8dab-c2ed365d0eea'],
};

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  const emailMatch = ADMIN_CONFIG.emails.includes((user.email || '').toLowerCase().trim());
  const idMatch = ADMIN_CONFIG.ids.includes(user.id);
  return emailMatch || idMatch;
}

// User Feedback Interface
export interface UserFeedback {
  id: string;
  user_id?: string;
  user_email: string;
  user_name?: string;
  category: 'bug' | 'feature' | 'improvement' | 'general';
  title: string;
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
  created_at: string;
}

const STORAGE_KEY_FEEDBACKS = 'archsketch_local_feedbacks_v1';

function getLocalFeedbacks(): UserFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFeedback(item: UserFeedback) {
  try {
    const existing = getLocalFeedbacks();
    const updated = [item, ...existing];
    localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(updated));
  } catch {
    // Ignore error
  }
}

/**
 * Submit user feedback, bug report, or feature suggestion to Supabase.
 * Mirrors to localStorage for zero-loss offline resiliency.
 */
export async function submitUserFeedback(
  feedback: Omit<UserFeedback, 'id' | 'status' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
  const newFeedback: UserFeedback = {
    ...feedback,
    id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: 'new',
    created_at: new Date().toISOString(),
  };

  // Always save locally so no feedback is ever lost
  saveLocalFeedback(newFeedback);

  const client = getSupabase();
  if (!client) {
    return { success: true };
  }

  try {
    const { error } = await client.from('archsketch_feedback').insert([
      {
        user_id: feedback.user_id || null,
        user_email: feedback.user_email,
        user_name: feedback.user_name || feedback.user_email.split('@')[0],
        category: feedback.category,
        title: feedback.title,
        message: feedback.message,
        status: 'new',
      },
    ]);

    if (error) {
      console.warn('Feedback saved locally; Supabase error:', error.message);
    }
    return { success: true };
  } catch (err) {
    console.warn('Network issue saving feedback, preserved locally:', err);
    return { success: true };
  }
}

/**
 * Fetch all submitted feedback (for Admin Hub)
 */
export async function fetchUserFeedbacks(): Promise<{ feedbacks: UserFeedback[]; error?: string }> {
  const client = getSupabase();
  const localList = getLocalFeedbacks();

  if (!client) {
    return { feedbacks: localList };
  }

  try {
    const { data, error } = await client
      .from('archsketch_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch feedback error, using local fallback:', error.message);
      return { feedbacks: localList };
    }

    // Merge remote with local to guarantee no missing records
    const map = new Map<string, UserFeedback>();
    (data || []).forEach((item) => map.set(item.id, item as UserFeedback));
    localList.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { feedbacks: combined };
  } catch (err) {
    return { feedbacks: localList };
  }
}

/**
 * Update feedback status (for Admin Hub)
 */
export async function updateFeedbackStatus(
  id: string,
  status: 'new' | 'reviewed' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
  // Update local
  try {
    const local = getLocalFeedbacks().map((f) => (f.id === id ? { ...f, status } : f));
    localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(local));
  } catch {
    // Ignore error
  }

  const client = getSupabase();
  if (!client) return { success: true };

  try {
    const { error } = await client
      .from('archsketch_feedback')
      .update({ status })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown update error' };
  }
}

/**
 * Delete feedback (for Admin Hub)
 */
export async function deleteFeedback(id: string): Promise<{ success: boolean; error?: string }> {
  // Update local
  try {
    const local = getLocalFeedbacks().filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(local));
  } catch {
    // Ignore error
  }

  const client = getSupabase();
  if (!client) return { success: true };

  try {
    const { error } = await client.from('archsketch_feedback').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown delete error' };
  }
}


