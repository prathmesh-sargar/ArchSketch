# 🏗️ ArchSketch System Architecture

> **Complete technical architecture and engineering reference for ArchSketch.**  
> *Living document for team onboarding, system updates, and architecture reviews.*

---

## 1. High-Level System Architecture

ArchSketch is built on a **Modern Offline-First Client + Serverless PostgreSQL** architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHSKETCH SYSTEM TOPOLOGY                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [ CLIENT LAYER ]                                                      │
│  React 19 + TypeScript + Vite + Tailwind CSS v4                        │
│  │                                                                     │
│  ├── [ Canvas Engine ] ───── @xyflow/react + Rough.js                  │
│  ├── [ State Store ] ─────── React State + LocalStorage (Offline Cache)│
│  └── [ API Client ] ──────── @supabase/supabase-js                     │
│              │                                                         │
│              ▼ (HTTPS / JWT Bearer Tokens)                             │
│                                                                        │
│  [ BACKEND AS A SERVICE LAYER - SUPABASE ]                             │
│  │                                                                     │
│  ├── [ Auth Gateway ] ────── Supabase Auth (Google OAuth & Email/Pass) │
│  ├── [ REST / PostgREST ] ── Auto-generated CRUD APIs                  │
│  ├── [ Realtime Engine ] ─── WebSockets for presence / broadcast       │
│  └── [ Database Engine ] ─── PostgreSQL 15                             │
│              │                                                         │
│              ├── public.profiles (User identity & avatars)             │
│              ├── public.archsketch_projects (Canvas JSONB graphs)      │
│              ├── public.project_members (Team RBAC permissions)        │
│              └── Row Level Security (Tenant isolation via auth.uid())  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack Summary

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | UI component hierarchy and type-safe state |
| **Bundler & Tooling** | Vite 8 + Oxlint | Ultra-fast HMR and build optimization |
| **Canvas Engine** | `@xyflow/react` (React Flow) | Infinite zoom/pan, custom nodes, handles & edge routing |
| **Aesthetic Styling** | Tailwind CSS v4 + Rough.js | Modern dark-mode UI with architectural sketchy accents |
| **Icons** | Lucide React | Clean, consistent icons across controls and nodes |
| **Cloud Database** | Supabase (PostgreSQL 15) | Relational storage + JSONB graph documents |
| **User Authentication** | Supabase Auth | Google OAuth 2.0 & Email/Password with JWT sessions |
| **Access Control** | Postgres Row Level Security (RLS) | Database-level data isolation between users |

---

## 3. Data Flow & Synchronization Strategy

ArchSketch uses an **Optimistic Offline-First Synchronization** model:

```
User Action (Drag node, add column, rename project)
       │
       ▼
1. Update React In-Memory State (Instant 60fps UI update)
       │
       ▼
2. Persist to LocalStorage (`archsketch_projects_v2`)
   └── Guarantees work is never lost even if network disconnects
       │
       ▼
3. Cloud Sync (If authenticated)
   ├── Payload: `{ id, name, nodes: JSONB, edges: JSONB, owner_id: auth.uid() }`
   └── Supabase Upsert: `client.from('archsketch_projects').upsert(...)`
```

---

## 4. Multi-Tenant User Isolation & Security (How User Data Is Protected)

One of the most important concepts is **how User A cannot see or edit User B's projects**:

```
[ Request from Prathmesh ] ---> JWT Header: { sub: "user-uuid-123" }
                                         │
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │       PostgreSQL Row Level Security (RLS)       │
                 │                                                │
                 │  SELECT * FROM public.archsketch_projects      │
                 │  WHERE owner_id = auth.uid()                   │
                 │     OR id IN (project_members)                 │
                 └───────────────────────┬────────────────────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       ▼                                   ▼
          [ Returns Prathmesh's Data ]        [ Blocks All Other Users ]
```

### The Exact RLS Policy:
```sql
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
```
- Direct, non-recursive verification on `auth.uid() = owner_id OR auth.uid() = user_id`.
- Prevents PostgreSQL infinite policy recursion loops caused by mutually recursive subqueries.
- When a user queries `archsketch_projects`, PostgreSQL automatically injects the active user's ID into the query.
- Even if someone attempts to query another user's project ID through the API, PostgreSQL returns an empty result set.

---

## 5. Component Hierarchy

```
App.tsx (Root Controller & State Coordinator)
 ├── Header.tsx (Global navigation, theme toggle, Log in / User profile button)
 ├── ProjectsSidebar.tsx (Collapsible drawer: workspace switcher, inline rename, delete)
 ├── Canvas.tsx (React Flow canvas container)
 │    ├── TableNode.tsx (Database schema node with column editor)
 │    ├── ServiceNode.tsx (Microservice / Gateway / Cache node with protocols)
 │    └── NoteNode.tsx (Architectural sticky note)
 └── Modals
      ├── AuthModal (Sleek Google OAuth & Email/Password)
      ├── AccountModal (Cloud sync, project status, sign out)
      ├── ExportModal (PostgreSQL DDL schema generator)
      └── AIModal (Prompt-to-schema blueprint generator)
```

---

## 6. Deployment & Environment Configuration

When promoting ArchSketch to production:

```env
# .env.local (or Vercel / Netlify environment variables)
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

- In **Supabase Dashboard > Auth > URL Configuration**: Add production domains (`https://your-domain.com/**`).
- In **Google Cloud Console > Credentials**: Add production domains to Authorized JavaScript origins.
