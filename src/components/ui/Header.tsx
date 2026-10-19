import React from 'react';
import { Layers, Sparkles, Download, Plus, Moon, Sun, Table2, Box, LogIn, Cloud, User as UserIcon, MessageSquare, ShieldCheck } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface HeaderProps {
  onExportSQL: () => void;
  onAskAI: () => void;
  onAddTable: () => void;
  onAddService: () => void;
  onAddNote: () => void;
  onOpenCloudSync?: () => void;
  onOpenAuthModal: () => void;
  currentUser: User | null;
  isCloudConnected?: boolean;
  activeProjectTitle?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onToggleProjectsSidebar?: () => void;
  onNavigateToLanding?: () => void;
  onOpenFeedback: () => void;
  isAdmin?: boolean;
  onOpenAdminHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExportSQL,
  onAskAI,
  onAddTable,
  onAddService,
  onAddNote,
  onOpenCloudSync,
  onOpenAuthModal,
  currentUser,
  isCloudConnected = false,
  activeProjectTitle,
  isDarkMode,
  onToggleTheme,
  onToggleProjectsSidebar,
  onNavigateToLanding,
  onOpenFeedback,
  isAdmin = false,
  onOpenAdminHub,
}) => {
  return (
    <header className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between px-5 py-2.5 bg-card/85 backdrop-blur-md border border-border rounded-2xl shadow-xl transition-colors">
      <div 
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={onNavigateToLanding}
        title="View Landing Page & Cinematic Footer"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-sm shadow-sm select-none group-hover:scale-105 transition-transform">
          <Layers className="w-4 h-4 text-black" />
        </div>
        <div>
          <h1 className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5 group-hover:text-amber-500 transition-colors">
            ArchSketch
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-normal">v2</span>
          </h1>
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            System Architecture & Database ERD Canvas
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Add Table Button */}
        <button
          onClick={onAddTable}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>New Table</span>
        </button>

        {/* Add Service Button */}
        <button
          onClick={onAddService}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-medium text-xs transition-all active:scale-95 cursor-pointer"
          title="Add a Microservice / API Gateway / Cache block"
        >
          <Box className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">New Service</span>
        </button>

        {/* Add Sticky Note */}
        <button
          onClick={onAddNote}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-medium text-xs transition-all active:scale-95 cursor-pointer"
          title="Add free-form architectural notes or requirements"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">New Note</span>
        </button>

        {/* AI Architect */}
        <button
          onClick={onAskAI}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI Architect</span>
        </button>

        {/* Export SQL */}
        <button
          onClick={onExportSQL}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-medium text-xs transition-all active:scale-95 cursor-pointer"
          title="Export production PostgreSQL DDL from current canvas"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Export SQL</span>
        </button>

        {/* Feedback / Bug Report Button (Only for Logged-In Users) */}
        {currentUser && (
          <button
            onClick={onOpenFeedback}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-medium text-xs transition-all active:scale-95 cursor-pointer"
            title="Share feedback or report a bug"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">Feedback</span>
          </button>
        )}

        {/* Admin Portal Button (Only visible to Prathmesh / Admin) */}
        {isAdmin && (
          <button
            onClick={onOpenAdminHub}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Admin Feedback & Management Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          </button>
        )}


        {/* Cloud User Profile or Log In Button */}
        {currentUser ? (
          <button
            onClick={onOpenCloudSync}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-muted/80 hover:bg-muted border border-border text-foreground font-medium text-xs transition-all cursor-pointer"
            title="Cloud Account & Synced Projects"
          >
            {currentUser.user_metadata?.avatar_url ? (
              <img
                src={currentUser.user_metadata.avatar_url}
                alt="avatar"
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                {(currentUser.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline max-w-[120px] truncate text-[11px]">
              {currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0]}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-foreground text-background hover:opacity-90 font-semibold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log in</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground transition-all cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};

