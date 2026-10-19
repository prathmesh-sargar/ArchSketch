import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from './components/canvas/Canvas';
import { Header } from './components/ui/Header';
import { ProjectsSidebar } from './components/ui/ProjectsSidebar';
import { LandingPage } from './components/landing/LandingPage';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { SQLDataType } from './types/schema';
import { 
  Plus, X, Sparkles, Database, Layers, Bot, Cloud, 
  Check, Copy, Lock, Key, LogIn, UserPlus, LogOut, RefreshCw, AlertCircle,
  ChevronRight, FolderKanban, Play
} from 'lucide-react';
import { 
  getSupabase, 
  getSavedSupabaseConfig, 
  saveSupabaseConfig, 
  loadLocalProjects, 
  saveLocalProjects, 
  syncProjectToCloud, 
  deleteProjectFromCloud,
  fetchProjectsFromCloud, 
  signInWithOAuthProvider,
  onAuthChange,
  SUPABASE_SQL_MIGRATION,
  CloudProject 
} from './lib/supabase';
import { sendWelcomeEmail } from './lib/emailService';
import { User } from '@supabase/supabase-js';

const PRESET_PROJECTS: CloudProject[] = [
  {
    id: 'ecommerce-core',
    name: 'E-Commerce Platform',
    description: 'PostgreSQL relational core with Redis caching & API Gateway',
    nodes: [
      {
        id: 'gateway-svc',
        type: 'serviceNode',
        position: { x: 80, y: 40 },
        data: {
          serviceName: 'API Gateway & Auth',
          role: 'gateway',
          protocol: 'HTTPS / GraphQL',
          color: '#8b5cf6',
        },
      },
      {
        id: 'cache-svc',
        type: 'serviceNode',
        position: { x: 440, y: 40 },
        data: {
          serviceName: 'Redis Session Cache',
          role: 'cache',
          protocol: 'RESP (Port 6379)',
          color: '#ef4444',
        },
      },
      {
        id: 'users-table',
        type: 'tableNode',
        position: { x: 80, y: 220 },
        data: {
          tableName: 'users',
          schema: 'public',
          columns: [
            { id: 'u1', name: 'id', type: 'UUID', isPrimaryKey: true },
            { id: 'u2', name: 'email', type: 'VARCHAR(255)', isUnique: true },
            { id: 'u3', name: 'password_hash', type: 'VARCHAR(255)' },
            { id: 'u4', name: 'full_name', type: 'VARCHAR(255)', isNullable: true },
            { id: 'u5', name: 'created_at', type: 'TIMESTAMP' },
          ],
        },
      },
      {
        id: 'orders-table',
        type: 'tableNode',
        position: { x: 460, y: 220 },
        data: {
          tableName: 'orders',
          schema: 'public',
          columns: [
            { id: 'o1', name: 'id', type: 'UUID', isPrimaryKey: true },
            { id: 'o2', name: 'user_id', type: 'UUID', isForeignKey: true },
            { id: 'o3', name: 'total_amount', type: 'NUMERIC(10,2)' },
            { id: 'o4', name: 'status', type: 'VARCHAR(255)' },
            { id: 'o5', name: 'created_at', type: 'TIMESTAMP' },
          ],
        },
      },
      {
        id: 'order-items-table',
        type: 'tableNode',
        position: { x: 840, y: 220 },
        data: {
          tableName: 'order_items',
          schema: 'public',
          columns: [
            { id: 'oi1', name: 'id', type: 'BIGINT', isPrimaryKey: true },
            { id: 'oi2', name: 'order_id', type: 'UUID', isForeignKey: true },
            { id: 'oi3', name: 'product_id', type: 'UUID', isForeignKey: true },
            { id: 'oi4', name: 'quantity', type: 'INT' },
            { id: 'oi5', name: 'unit_price', type: 'NUMERIC(10,2)' },
          ],
        },
      },
      {
        id: 'design-note',
        type: 'noteNode',
        position: { x: 80, y: 460 },
        data: {
          title: 'Scaling Strategy (10k Users)',
          text: '- Add read-replicas for users table.\n- Redis cluster holds cart & JWT tokens.\n- Kafka streams order events to payment processing.',
        },
      },
    ],
    edges: [
      {
        id: 'e-gateway-cache',
        source: 'gateway-svc',
        target: 'cache-svc',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      },
      {
        id: 'e-users-orders',
        source: 'users-table',
        target: 'orders-table',
        sourceHandle: 'col-out-u1',
        targetHandle: 'col-in-o2',
        animated: true,
        style: { stroke: '#fbbf24', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
      },
      {
        id: 'e-orders-items',
        source: 'orders-table',
        target: 'order-items-table',
        sourceHandle: 'col-out-o1',
        targetHandle: 'col-in-oi2',
        animated: true,
        style: { stroke: '#38bdf8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      },
    ],
  },
  {
    id: 'social-graph',
    name: 'Social Network & Feeds',
    description: 'Relational Graph schema with Kafka feed generator',
    nodes: [
      {
        id: 'users-table',
        type: 'tableNode',
        position: { x: 80, y: 140 },
        data: {
          tableName: 'accounts',
          schema: 'public',
          columns: [
            { id: 'a1', name: 'id', type: 'UUID', isPrimaryKey: true },
            { id: 'a2', name: 'username', type: 'VARCHAR(255)', isUnique: true },
            { id: 'a3', name: 'bio', type: 'TEXT', isNullable: true },
            { id: 'a4', name: 'followers_count', type: 'INT' },
          ],
        },
      },
      {
        id: 'posts-table',
        type: 'tableNode',
        position: { x: 480, y: 140 },
        data: {
          tableName: 'posts',
          schema: 'public',
          columns: [
            { id: 'p1', name: 'id', type: 'UUID', isPrimaryKey: true },
            { id: 'p2', name: 'author_id', type: 'UUID', isForeignKey: true },
            { id: 'p3', name: 'content', type: 'TEXT' },
            { id: 'p4', name: 'likes_count', type: 'INT' },
            { id: 'p5', name: 'created_at', type: 'TIMESTAMP' },
          ],
        },
      },
      {
        id: 'comments-table',
        type: 'tableNode',
        position: { x: 880, y: 140 },
        data: {
          tableName: 'comments',
          schema: 'public',
          columns: [
            { id: 'c1', name: 'id', type: 'BIGINT', isPrimaryKey: true },
            { id: 'c2', name: 'post_id', type: 'UUID', isForeignKey: true },
            { id: 'c3', name: 'user_id', type: 'UUID', isForeignKey: true },
            { id: 'c4', name: 'text', type: 'TEXT' },
          ],
        },
      },
      {
        id: 'feed-worker',
        type: 'serviceNode',
        position: { x: 480, y: 440 },
        data: {
          serviceName: 'Fanout Feed Worker',
          role: 'microservice',
          protocol: 'Kafka Event Consumer',
          color: '#3b82f6',
        },
      },
    ],
    edges: [
      {
        id: 'e-author-posts',
        source: 'users-table',
        target: 'posts-table',
        sourceHandle: 'col-out-a1',
        targetHandle: 'col-in-p2',
        animated: true,
        style: { stroke: '#fbbf24', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
      },
      {
        id: 'e-post-comments',
        source: 'posts-table',
        target: 'comments-table',
        sourceHandle: 'col-out-p1',
        targetHandle: 'col-in-c2',
        animated: true,
        style: { stroke: '#38bdf8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      },
    ],
  },
  {
    id: 'uber-rideshare',
    name: 'Ride Hailing (Uber/Lyft)',
    description: 'Driver matchmaking, rides dispatch, and geospatial coordinates',
    nodes: [
      {
        id: 'drivers-table',
        type: 'tableNode',
        position: { x: 80, y: 140 },
        data: {
          tableName: 'drivers',
          schema: 'public',
          columns: [
            { id: 'd1', name: 'id', type: 'UUID', isPrimaryKey: true },
            { id: 'd2', name: 'name', type: 'VARCHAR(255)' },
            { id: 'd3', name: 'vehicle_plate', type: 'VARCHAR(255)' },
            { id: 'd4', name: 'is_active', type: 'BOOLEAN' },
          ],
        },
      },
      {
        id: 'rides-table',
        type: 'tableNode',
        position: { x: 480, y: 140 },
        data: {
          tableName: 'rides',
          schema: 'public',
          columns: [
            { id: 'r1', name: 'id', type: 'UUID', isPrimaryKey: true },
            { id: 'r2', name: 'driver_id', type: 'UUID', isForeignKey: true },
            { id: 'r3', name: 'rider_id', type: 'UUID', isForeignKey: true },
            { id: 'r4', name: 'fare_amount', type: 'NUMERIC(10,2)' },
            { id: 'r5', name: 'status', type: 'VARCHAR(255)' },
          ],
        },
      },
      {
        id: 'dispatch-service',
        type: 'serviceNode',
        position: { x: 80, y: 380 },
        data: {
          serviceName: 'Geo Matchmaker Engine',
          role: 'microservice',
          protocol: 'WebSocket / gRPC',
          color: '#10b981',
        },
      },
    ],
    edges: [
      {
        id: 'e-driver-rides',
        source: 'drivers-table',
        target: 'rides-table',
        sourceHandle: 'col-out-d1',
        targetHandle: 'col-in-r2',
        animated: true,
        style: { stroke: '#fbbf24', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
      },
    ],
  },
];

export function App() {
  // Initialize projects from localStorage (offline-first persistence) or default templates
  const [projects, setProjects] = useState<CloudProject[]>(() => {
    const saved = loadLocalProjects();
    return saved && saved.length > 0 ? saved : PRESET_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || PRESET_PROJECTS[0].id;
  });

  const [currentView, setCurrentView] = useState<'canvas' | 'landing'>(() => {
    return window.location.hash === '#canvas' ? 'canvas' : 'landing';
  });

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#canvas') {
        setCurrentView('canvas');
      } else if (window.location.hash === '#landing') {
        setCurrentView('landing');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isProjectsSidebarOpen, setIsProjectsSidebarOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Supabase Auth and Configuration state
  const [supabaseConfig, setSupabaseConfig] = useState(getSavedSupabaseConfig());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [authPromptContext, setAuthPromptContext] = useState<string | null>(null);
  const [copiedMigration, setCopiedMigration] = useState(false);

  // References to Canvas helper methods
  const addTableFnRef = useRef<() => void>(() => {});
  const addServiceFnRef = useRef<() => void>(() => {});
  const addNoteFnRef = useRef<() => void>(() => {});
  const applyAISchemaFnRef = useRef<(tables: { name: string; columns: { name: string; type: SQLDataType; isPrimaryKey?: boolean; isForeignKey?: boolean }[] }[]) => void>(() => {});

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Check Supabase session on mount and listen to OAuth/Session changes
  useEffect(() => {
    const client = getSupabase();
    if (client) {
      client.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUser(user);
      });
    }

    const subscription = onAuthChange((user) => {
      setCurrentUser(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseConfig]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || PRESET_PROJECTS[0];

  const [canvasRevision, setCanvasRevision] = useState(0);

  // Keep refs synchronized with state to prevent stale closures during async operations
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const activeProjectIdRef = useRef(activeProjectId);
  activeProjectIdRef.current = activeProjectId;

  // Auto-save timer reference for debounced Supabase writes
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize projects when user logs in or logs out
  useEffect(() => {
    if (currentUser) {
      // 1. One-time welcome onboarding trigger (Temporarily paused - can be re-enabled anytime)
      /*
      const welcomeStorageKey = `archsketch_welcomed_v1_${currentUser.id}`;
      const hasSeenWelcome = localStorage.getItem(welcomeStorageKey) || currentUser.user_metadata?.welcome_shown;

      if (!hasSeenWelcome) {
        // Mark locally immediately so it only executes once
        localStorage.setItem(welcomeStorageKey, 'true');
        setShowWelcomeModal(true);

        // Send welcome email via EmailJS (if configured)
        const displayName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
        sendWelcomeEmail({
          toEmail: currentUser.email || '',
          toName: displayName,
          appUrl: window.location.origin,
        }).then((res) => {
          if (res.success) {
            console.log('✓ Automated welcome email sent to:', currentUser.email);
          }
        });

        // Save welcome_shown flag to Supabase user metadata
        const client = getSupabase();
        if (client) {
          client.auth.updateUser({
            data: { welcome_shown: true },
          });
        }
      }
      */

      setSyncStatus('Loading your cloud workspaces...');
      fetchProjectsFromCloud(currentUser).then((res) => {
        if (res.projects && res.projects.length > 0) {
          setProjects(res.projects);
          setActiveProjectId(res.projects[0].id);
          saveLocalProjects(res.projects);
          setCanvasRevision((prev) => prev + 1);
          setSyncStatus('✓ Workspaces loaded from Supabase');
          setTimeout(() => setSyncStatus(null), 3000);
        } else {
          // If first-time user has no cloud projects, upload the active project to Supabase
          const initialProject: CloudProject = {
            ...activeProject,
            id: `project-${Date.now()}`,
            name: activeProject.name || 'My Architecture',
          };
          syncProjectToCloud(initialProject, currentUser).then(() => {
            setProjects([initialProject]);
            setActiveProjectId(initialProject.id);
            saveLocalProjects([initialProject]);
            setCanvasRevision((prev) => prev + 1);
            setSyncStatus('✓ First workspace saved to Supabase');
            setTimeout(() => setSyncStatus(null), 3000);
          });
        }
      });
    } else {
      // User is logged out: close sidebar and reset to single guest playground canvas
      setIsProjectsSidebarOpen(false);
      localStorage.removeItem('archsketch_projects_v2');
      const guestProject: CloudProject = {
        ...PRESET_PROJECTS[0],
        id: 'playground',
        name: 'Architecture Playground',
      };
      setProjects([guestProject]);
      setActiveProjectId(guestProject.id);
      setCanvasRevision((prev) => prev + 1);
    }
  }, [currentUser]);

  // Synchronize on tab close / tab switch (beforeunload & visibilitychange)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLocalProjects(projectsRef.current);
      if (currentUser) {
        const curProj = projectsRef.current.find((p) => p.id === activeProjectIdRef.current);
        if (curProj) {
          syncProjectToCloud(curProj, currentUser);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveLocalProjects(projectsRef.current);
        if (currentUser) {
          const curProj = projectsRef.current.find((p) => p.id === activeProjectIdRef.current);
          if (curProj) {
            syncProjectToCloud(curProj, currentUser);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Callback from Canvas whenever nodes or edges are updated in the active project
  // Instant hot save to localStorage; gentle idle auto-save to Supabase cloud
  const handleNodesEdgesChange = useCallback((nodes: Node[], edges: Edge[]) => {
    const curActiveId = activeProjectIdRef.current;
    setProjects((prevProjects) => {
      const updated = prevProjects.map((p) =>
        p.id === curActiveId ? { ...p, nodes, edges, updated_at: new Date().toISOString() } : p
      );
      // 1. Instant local persistence: hot state is never lost
      saveLocalProjects(updated);

      // 2. Gentle idle sync to Supabase cloud after user stops interacting (3s debounce)
      if (currentUser) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
          const currentProj = updated.find((p) => p.id === curActiveId);
          if (currentProj) {
            setSyncStatus('Syncing to Cloud...');
            const res = await syncProjectToCloud(currentProj, currentUser);
            if (res.success) {
              setSyncStatus('✓ Saved to Supabase');
              setTimeout(() => setSyncStatus(null), 2500);
            } else {
              setSyncStatus(`Sync error: ${res.error}`);
              setTimeout(() => setSyncStatus(null), 4000);
            }
          }
        }, 3000);
      }

      return updated;
    });
  }, [currentUser]);

  // Switch workspace: auto-save current workspace first, then load the new one!
  const handleSelectProject = async (id: string) => {
    if (id === activeProjectIdRef.current) {
      setIsProjectsSidebarOpen(false);
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (currentUser) {
      const curProj = projectsRef.current.find((p) => p.id === activeProjectIdRef.current);
      if (curProj) {
        setSyncStatus('Saving current workspace...');
        await syncProjectToCloud(curProj, currentUser);
      }
    }

    setActiveProjectId(id);
    setIsProjectsSidebarOpen(false);
    setSyncStatus(null);
  };

  const handleCreateNewProject = async () => {
    if (!currentUser) {
      setAuthPromptContext('Sign in with Google to create and save new project workspaces in the cloud.');
      setShowSupabaseModal(true);
      return;
    }

    const newId = `project-${Date.now()}`;
    const name = `Workspace ${projects.length + 1}`;
    const newProj: CloudProject = {
      id: newId,
      name,
      description: 'Custom architecture diagram',
      nodes: [
        {
          id: `tbl-${Date.now()}`,
          type: 'tableNode',
          position: { x: 120, y: 160 },
          data: {
            tableName: 'entities',
            schema: 'public',
            columns: [
              { id: '1', name: 'id', type: 'UUID', isPrimaryKey: true },
              { id: '2', name: 'name', type: 'VARCHAR(255)' },
              { id: '3', name: 'created_at', type: 'TIMESTAMP' },
            ],
          },
        },
      ],
      edges: [],
    };

    setProjects((prev) => {
      const updated = [...prev, newProj];
      saveLocalProjects(updated);
      return updated;
    });
    setActiveProjectId(newId);

    // Save directly to Supabase cloud!
    setSyncStatus('Creating in Supabase...');
    const res = await syncProjectToCloud(newProj, currentUser);
    if (res.success) {
      setSyncStatus(`✓ Created "${name}" in Supabase!`);
    } else {
      setSyncStatus(`Sync error: ${res.error}`);
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleRenameProject = async (id: string, newName: string) => {
    let targetProject: CloudProject | undefined;
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          targetProject = { ...p, name: newName };
          return targetProject;
        }
        return p;
      });
      saveLocalProjects(updated);
      return updated;
    });

    if (currentUser && targetProject) {
      setSyncStatus('Renaming in Supabase...');
      const res = await syncProjectToCloud(targetProject, currentUser);
      if (res.success) {
        setSyncStatus(`✓ Renamed to "${newName}" in Supabase!`);
      } else {
        setSyncStatus(`Sync error: ${res.error}`);
      }
      setTimeout(() => setSyncStatus(null), 2500);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length <= 1) return;
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveLocalProjects(updated);
      return updated;
    });

    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      if (remaining.length > 0) setActiveProjectId(remaining[0].id);
    }

    if (currentUser) {
      setSyncStatus('Deleting from Supabase...');
      const res = await deleteProjectFromCloud(id);
      if (res.success) {
        setSyncStatus('✓ Workspace deleted from Supabase');
      } else {
        setSyncStatus(`Delete error: ${res.error}`);
      }
      setTimeout(() => setSyncStatus(null), 2500);
    }
  };

  const handleAIGenerate = (customPrompt?: string) => {
    const promptToUse = (customPrompt || aiPrompt).toLowerCase();
    setShowAIModal(false);

    if (promptToUse.includes('uber') || promptToUse.includes('ride') || promptToUse.includes('cab')) {
      applyAISchemaFnRef.current?.([
        {
          name: 'riders',
          columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true },
            { name: 'phone', type: 'VARCHAR(255)' },
            { name: 'rating', type: 'NUMERIC(10,2)' },
          ],
        },
        {
          name: 'driver_locations',
          columns: [
            { name: 'id', type: 'BIGINT', isPrimaryKey: true },
            { name: 'driver_id', type: 'UUID', isForeignKey: true },
            { name: 'latitude', type: 'NUMERIC(10,2)' },
            { name: 'longitude', type: 'NUMERIC(10,2)' },
            { name: 'updated_at', type: 'TIMESTAMP' },
          ],
        },
        {
          name: 'ride_requests',
          columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true },
            { name: 'rider_id', type: 'UUID', isForeignKey: true },
            { name: 'pickup_address', type: 'TEXT' },
            { name: 'status', type: 'VARCHAR(255)' },
          ],
        },
      ]);
    } else if (promptToUse.includes('auth') || promptToUse.includes('rbac') || promptToUse.includes('security')) {
      applyAISchemaFnRef.current?.([
        {
          name: 'roles',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true },
            { name: 'role_name', type: 'VARCHAR(255)' },
            { name: 'description', type: 'TEXT' },
          ],
        },
        {
          name: 'permissions',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true },
            { name: 'action', type: 'VARCHAR(255)' },
            { name: 'resource', type: 'VARCHAR(255)' },
          ],
        },
        {
          name: 'user_roles',
          columns: [
            { name: 'user_id', type: 'UUID', isPrimaryKey: true, isForeignKey: true },
            { name: 'role_id', type: 'INT', isPrimaryKey: true, isForeignKey: true },
          ],
        },
      ]);
    } else if (promptToUse.includes('blog') || promptToUse.includes('cms')) {
      applyAISchemaFnRef.current?.([
        {
          name: 'articles',
          columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true },
            { name: 'title', type: 'VARCHAR(255)' },
            { name: 'slug', type: 'VARCHAR(255)' },
            { name: 'body', type: 'TEXT' },
            { name: 'published_at', type: 'TIMESTAMP' },
          ],
        },
        {
          name: 'tags',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true },
            { name: 'tag_name', type: 'VARCHAR(255)' },
          ],
        },
        {
          name: 'article_tags',
          columns: [
            { name: 'article_id', type: 'UUID', isPrimaryKey: true, isForeignKey: true },
            { name: 'tag_id', type: 'INT', isPrimaryKey: true, isForeignKey: true },
          ],
        },
      ]);
    } else {
      const cleaned = promptToUse.replace(/create|table|tables|schema|database|with/gi, '').trim();
      const extractedNames = cleaned.split(/,|\sand\s|\s+/).filter(Boolean);
      const table1Name = extractedNames[0] || 'customers';
      const table2Name = extractedNames[1] || 'transactions';

      applyAISchemaFnRef.current?.([
        {
          name: table1Name,
          columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true },
            { name: 'name', type: 'VARCHAR(255)' },
            { name: 'status', type: 'VARCHAR(255)' },
            { name: 'created_at', type: 'TIMESTAMP' },
          ],
        },
        {
          name: table2Name,
          columns: [
            { name: 'id', type: 'UUID', isPrimaryKey: true },
            { name: `${table1Name}_id`, type: 'UUID', isForeignKey: true },
            { name: 'amount', type: 'NUMERIC(10,2)' },
            { name: 'timestamp', type: 'TIMESTAMP' },
          ],
        },
      ]);
    }

    setAiPrompt('');
  };

  // Supabase Auth Handlers
  const handleSaveSupabaseConfig = () => {
    saveSupabaseConfig(supabaseConfig);
    setSyncStatus('Supabase configuration saved!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleSignIn = async () => {
    const client = getSupabase();
    if (!client) {
      setSyncStatus('Configure Supabase URL & Key first.');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await client.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      setSyncStatus(`Auth error: ${error.message}`);
    } else if (data.user) {
      setCurrentUser(data.user);
      setSyncStatus(`Signed in as ${data.user.email}!`);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleSignUp = async () => {
    const client = getSupabase();
    if (!client) {
      setSyncStatus('Configure Supabase URL & Key first.');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await client.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      setSyncStatus(`Sign up error: ${error.message}`);
    } else if (data.user) {
      setCurrentUser(data.user);
      setSyncStatus('Account created successfully! Check your email or login.');
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setAuthLoading(true);
    setSyncStatus(`Redirecting to ${provider}...`);
    const { error } = await signInWithOAuthProvider(provider);
    if (error) {
      setSyncStatus(`OAuth error: ${error.message}`);
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    // 1. Flush any pending unsaved work to Supabase BEFORE signing out!
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (currentUser) {
      const latestProj = projectsRef.current.find((p) => p.id === activeProjectIdRef.current);
      if (latestProj) {
        setSyncStatus('Saving changes before sign out...');
        await syncProjectToCloud(latestProj, currentUser);
      }
    }

    const client = getSupabase();
    if (client) {
      await client.auth.signOut();
    }
    setCurrentUser(null);
    setIsProjectsSidebarOpen(false);
    setShowSupabaseModal(false);
    localStorage.removeItem('archsketch_projects_v2');
    const guestProject: CloudProject = {
      ...PRESET_PROJECTS[0],
      id: 'playground',
      name: 'Architecture Playground',
    };
    setProjects([guestProject]);
    setActiveProjectId(guestProject.id);
    setCanvasRevision((prev) => prev + 1);
    setSyncStatus('Signed out.');
    setTimeout(() => setSyncStatus(null), 2000);
  };

  const handleSyncCurrentProject = async () => {
    setSyncStatus('Syncing to Supabase PostgreSQL...');
    const res = await syncProjectToCloud(activeProject, currentUser);
    if (res.success) {
      setSyncStatus(`✓ Successfully synced "${activeProject.name}" to Supabase!`);
    } else {
      setSyncStatus(`Sync failed: ${res.error}`);
    }
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const handlePullCloudProjects = async () => {
    setSyncStatus('Fetching projects from Supabase...');
    const res = await fetchProjectsFromCloud(currentUser);
    if (res.projects && res.projects.length > 0) {
      setProjects(res.projects);
      saveLocalProjects(res.projects);
      setCanvasRevision((prev) => prev + 1);
      setSyncStatus(`✓ Pulled ${res.projects.length} project(s) from Supabase!`);
    } else if (res.error) {
      setSyncStatus(`Fetch error: ${res.error}`);
    } else {
      setSyncStatus('No projects found in cloud.');
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const isCloudConnected = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  return (
    <div className={`relative w-full ${currentView === 'canvas' ? 'w-screen h-screen overflow-hidden select-none' : 'min-h-screen overflow-x-hidden'} bg-background text-foreground transition-colors flex flex-col`}>
      {currentView === 'landing' ? (
        <LandingPage
          onEnterStudio={() => {
            window.location.hash = '#canvas';
            setCurrentView('canvas');
          }}
          onOpenAuth={() => {
            setAuthPromptContext('Sign in with Google to sync your architectures across devices.');
            setShowSupabaseModal(true);
          }}
          onOpenCloudSync={() => {
            setAuthPromptContext(null);
            setShowSupabaseModal(true);
          }}
          currentUser={currentUser}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          {/* Top Navigation Bar */}
          <Header
            onExportSQL={() => setShowExportModal(true)}
            onAskAI={() => setShowAIModal(true)}
            onAddTable={() => addTableFnRef.current?.()}
            onAddService={() => addServiceFnRef.current?.()}
            onAddNote={() => addNoteFnRef.current?.()}
            onOpenCloudSync={() => {
              setAuthPromptContext(null);
              setShowSupabaseModal(true);
            }}
            onOpenAuthModal={() => {
              setAuthPromptContext(null);
              setShowSupabaseModal(true);
            }}
            onNavigateToLanding={() => {
              window.location.hash = '#landing';
              setCurrentView('landing');
            }}
            currentUser={currentUser}
            isCloudConnected={isCloudConnected}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
          />

          {/* Interactive Workspaces & Projects Sidebar (Only active for authenticated users) */}
          <ProjectsSidebar
            isOpen={isProjectsSidebarOpen}
            onClose={() => setIsProjectsSidebarOpen(false)}
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateNewProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            currentUser={currentUser}
            onOpenAuthModal={() => {
              setAuthPromptContext('Sign in with Google to create and sync your project workspaces.');
              setShowSupabaseModal(true);
            }}
            onSyncProject={handleSyncCurrentProject}
            syncStatus={syncStatus}
          />

          {/* Floating Interactive Workspaces Hamburger Pill below Navbar */}
          {!isProjectsSidebarOpen && (
            <div className="absolute top-[74px] left-4 z-40 flex items-center">
              <button
                onClick={() => {
                  if (!currentUser) {
                    setAuthPromptContext('Sign in with Google to manage and save your architecture workspaces.');
                    setShowSupabaseModal(true);
                  } else {
                    setIsProjectsSidebarOpen(true);
                  }
                }}
                className="group flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-card/90 hover:bg-card text-foreground border border-border/80 shadow-md backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer hover:border-amber-500/40"
                title={currentUser ? "Open Workspaces Drawer" : "Sign in to save multiple workspaces"}
              >
                {/* Animated Hamburger Icon */}
                <div className="w-3.5 h-3 flex flex-col justify-between py-0.5">
                  <span className="w-3.5 h-0.5 bg-amber-500 rounded-full transition-all group-hover:w-2.5"></span>
                  <span className="w-2.5 h-0.5 bg-foreground group-hover:bg-amber-400 rounded-full transition-all group-hover:w-3.5"></span>
                  <span className="w-3 h-0.5 bg-foreground group-hover:bg-amber-400 rounded-full transition-all group-hover:w-2"></span>
                </div>

                <span className="text-xs font-semibold text-foreground group-hover:text-amber-400 transition-colors">
                  {currentUser ? activeProject.name : 'Architecture Playground'}
                </span>

                {currentUser ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border group-hover:border-amber-500/30">
                    {projects.length}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Guest
                  </span>
                )}

                <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          )}

          {/* Main Flow Canvas with active project workspace */}
          <div className="flex-1 w-full h-full pt-14">
            <Canvas
              key={`${activeProject.id}-${canvasRevision}`}
              isDarkMode={isDarkMode}
              initialNodes={activeProject.nodes}
              initialEdges={activeProject.edges}
              onAddTableRef={(fn) => { addTableFnRef.current = fn; }}
              onAddServiceRef={(fn) => { addServiceFnRef.current = fn; }}
              onAddNoteRef={(fn) => { addNoteFnRef.current = fn; }}
              onApplyAISchemaRef={(fn) => { applyAISchemaFnRef.current = fn; }}
              onNodesEdgesChange={handleNodesEdgesChange}
            />
          </div>
        </>
      )}

      {/* SQL Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl backdrop-blur-xl text-white animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">PostgreSQL Production Schema</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              DDL script generated from <span className="font-semibold text-white">{activeProject.name}</span> canvas:
            </p>
            <pre className="bg-black/50 border border-white/15 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-64 select-text leading-relaxed">
{`-- Generated by ArchSketch for ${activeProject.name}
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_amount" NUMERIC(10,2) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON "orders"("user_id");`}
            </pre>
            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white border border-white/15 cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`CREATE TABLE users (id UUID PRIMARY KEY);`);
                  setShowExportModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-black cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Copy SQL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Architect Assistant Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl backdrop-blur-xl text-white animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">AI Architecture & Schema Assistant</h3>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Enter any prompt or select a quick starter pattern. ArchSketch will automatically synthesize tables, primary & foreign keys, and place them on your canvas:
            </p>

            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Design a ride-sharing system with riders, trips, driver locations, and fares..."
              className="w-full bg-black/40 border border-white/20 focus:border-purple-400 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none mb-3 transition-colors"
              autoFocus
            />

            {/* Quick Prompt Templates */}
            <div className="space-y-1.5 mb-4">
              <p className="text-[11px] font-semibold text-zinc-400">Quick Blueprints:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Uber Ride-hailing', prompt: 'Uber ride-sharing system with drivers, riders, rides' },
                  { label: 'RBAC Authorization', prompt: 'RBAC system with roles, permissions, user_roles' },
                  { label: 'Blog / CMS', prompt: 'Blog CMS with articles, tags, comments' },
                  { label: 'School LMS', prompt: 'School LMS with students, courses, enrollments' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleAIGenerate(item.prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-purple-500/20 hover:text-purple-300 border border-white/15 text-zinc-200 transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white border border-white/15 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAIGenerate()}
                disabled={!aiPrompt.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 cursor-pointer flex items-center space-x-1.5 active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Architecture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-Time Founder Welcome Modal (Temporarily paused - can be re-enabled anytime) */}
      {/*
      showWelcomeModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in duration-200 backdrop-blur-xl text-white">
            <button
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3.5 mb-4 pb-3.5 border-b border-white/10">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-black font-extrabold text-sm flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                PS
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Welcome to ArchSketch!</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                    Founder Note
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Prathmesh Sargar • Creator</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed mb-5">
              <p>
                Hi <span className="font-semibold text-white">{currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'there'}</span>, 
                thank you for joining ArchSketch!
              </p>
              <p>
                I built ArchSketch to give software architects and engineering teams a fast, visual CAD workspace to design database schemas, microservice topologies, and distributed event pipelines — with instant PostgreSQL DDL export.
              </p>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11.5px] leading-tight">
                  A personal welcome email &amp; quick-start guide was just sent to <strong className="text-amber-200">{currentUser.email}</strong>.
                </span>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2 text-[11.5px]">
                <p className="font-semibold text-zinc-200 text-xs uppercase tracking-wide">3 Quick Tips to Get Started:</p>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">1.</span>
                  <span>Drag tables, microservices, caches, and queues directly onto the canvas.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">2.</span>
                  <span>Drag connection lines between primary and foreign keys visually.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">3.</span>
                  <span>Click <strong>"Export SQL"</strong> in the top header to copy your DDL migration in 1 click.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Start Designing on Canvas</span>
              </button>
            </div>
          </div>
        </div>
      )
      */}

      {/* Modern SaaS Auth Modal (When Not Signed In) */}
      {showSupabaseModal && !currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in duration-150 backdrop-blur-xl text-white">
            <button
              onClick={() => {
                setShowSupabaseModal(false);
                setAuthPromptContext(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-black shadow-lg shadow-amber-500/20 mb-3">
                <Layers className="w-6 h-6 font-bold" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Sign in to ArchSketch
              </h3>
              <p className="text-xs text-zinc-300 mt-1 px-2">
                {authPromptContext || 'Save your architecture diagrams to the cloud and collaborate with your team.'}
              </p>
            </div>

            {syncStatus && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syncStatus}</span>
              </div>
            )}

            {/* 1-Click Google Login Button */}
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-white font-medium text-xs flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-white/15"></div>
              <span className="flex-shrink mx-2 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Or with Email</span>
              <div className="flex-grow border-t border-white/15"></div>
            </div>

            {/* Email / Password Form */}
            <div className="space-y-2.5">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Work or personal email"
                className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
              />

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={handleSignIn}
                  disabled={authLoading || !authEmail || !authPassword}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={handleSignUp}
                  disabled={authLoading || !authEmail || !authPassword}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-zinc-200 border border-white/15 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-center text-zinc-400 mt-4">
              Single canvas is free for everyone. Sign in to sync across devices.
            </p>
          </div>
        </div>
      )}

      {/* Modern Account & Cloud Projects Modal (When Signed In) */}
      {showSupabaseModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in duration-150 backdrop-blur-xl text-white">
            <button
              onClick={() => setShowSupabaseModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Info */}
            <div className="flex items-center space-x-3.5 mb-5 pb-4 border-b border-white/15">
              {currentUser.user_metadata?.avatar_url ? (
                <img
                  src={currentUser.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-11 h-11 rounded-2xl border border-white/20 shadow-sm"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 font-bold text-base flex items-center justify-center border border-amber-500/30">
                  {(currentUser.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                </h3>
                <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[11px] text-emerald-400 font-medium">Cloud Database Connected</span>
                </div>
              </div>
            </div>

            {syncStatus && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syncStatus}</span>
              </div>
            )}

            {/* Cloud Actions */}
            <div className="space-y-3 mb-6">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Cloud Sync & Projects
              </h4>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/15 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">{activeProject.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {activeProject.nodes.length} nodes · {activeProject.edges.length} connections
                  </p>
                </div>
                <button
                  onClick={handleSyncCurrentProject}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sync to Cloud</span>
                </button>
              </div>

              <button
                onClick={handlePullCloudProjects}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/15 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Refresh Projects from Cloud</span>
              </button>
            </div>

            {/* Sign Out Footer */}
            <div className="pt-3 border-t border-white/15 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">ArchSketch Cloud</span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
