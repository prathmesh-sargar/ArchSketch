import React, { useState } from 'react';
import { 
  FolderKanban, Plus, Trash2, Edit2, Check, X, Cloud, 
  Database, Layers, Sparkles, ChevronLeft, Search, LogIn
} from 'lucide-react';
import { CloudProject } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

interface ProjectsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: CloudProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onSyncProject: () => void;
  syncStatus: string | null;
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  currentUser,
  onOpenAuthModal,
  onSyncProject,
  syncStatus,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const startEditing = (p: CloudProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditName(p.name);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editName.trim();
    if (trimmed) {
      onRenameProject(id, trimmed);
    }
    setEditingId(null);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen || !currentUser) return null;

  return (
    <>
      {/* Backdrop for mobile / tablet */}
      <div 
        className="fixed inset-0 top-[70px] z-30 bg-black/50 backdrop-blur-xs md:hidden"
        onClick={onClose}
      />

      <aside className="fixed top-[74px] bottom-4 left-4 w-80 z-40 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col transition-all duration-300 select-none animate-in slide-in-from-left overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Workspaces</h2>
              <p className="text-[11px] text-muted-foreground">
                {projects.length} project{projects.length === 1 ? '' : 's'} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & New Project Button */}
        <div className="p-3 border-b border-border/70 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <button
            onClick={onCreateProject}
            className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Architecture Workspace</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-muted-foreground">
              No projects found matching "{searchQuery}"
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isActive = p.id === activeProjectId;
              const isEditing = editingId === p.id;
              const tableCount = p.nodes.filter((n) => n.type === 'tableNode').length;
              const serviceCount = p.nodes.filter((n) => n.type === 'serviceNode').length;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!isEditing) onSelectProject(p.id);
                  }}
                  className={`group relative rounded-xl p-3 border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/40 text-foreground shadow-xs'
                      : 'bg-card/50 hover:bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-amber-500 text-black' : 'bg-muted text-muted-foreground group-hover:text-foreground'}`}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>

                      {isEditing ? (
                        <form
                          onSubmit={(e) => saveRename(p.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 flex-1 min-w-0"
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                            className="w-full bg-background border border-amber-500 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none font-medium"
                          />
                          <button
                            type="submit"
                            className="p-1 rounded-md bg-emerald-500 text-black hover:bg-emerald-400 shrink-0"
                            title="Save name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="p-1 rounded-md bg-muted text-muted-foreground hover:text-foreground shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-foreground' : ''}`}>
                            {p.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {tableCount} tables · {serviceCount} services
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEditing(p, e)}
                          className="p-1 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-muted transition-colors cursor-pointer"
                          title="Rename workspace"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                                onDeleteProject(p.id);
                              }
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-muted transition-colors cursor-pointer"
                            title="Delete workspace"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Account Status */}
        <div className="p-3.5 border-t border-border bg-card/40">
          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  {currentUser.user_metadata?.avatar_url ? (
                    <img
                      src={currentUser.user_metadata.avatar_url}
                      alt="avatar"
                      className="w-7 h-7 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                      {(currentUser.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Cloud Synced
                    </p>
                  </div>
                </div>

                <button
                  onClick={onSyncProject}
                  className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
                  title="Sync Active Project to Supabase"
                >
                  <Cloud className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              {syncStatus && (
                <p className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5 text-center">
                  {syncStatus}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Workspaces are currently saved in your browser.
              </p>
              <button
                onClick={onOpenAuthModal}
                className="w-full py-1.5 px-3 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
