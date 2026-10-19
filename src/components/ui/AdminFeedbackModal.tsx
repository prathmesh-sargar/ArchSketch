import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, RefreshCw, Trash2, CheckCircle2, Clock, 
  Bug, Lightbulb, Sparkles, MessageSquare, Search, Filter 
} from 'lucide-react';
import { 
  fetchUserFeedbacks, 
  updateFeedbackStatus, 
  deleteFeedback, 
  UserFeedback 
} from '../../lib/supabase';

interface AdminFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminFeedbackModal: React.FC<AdminFeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadFeedbacks = async () => {
    setIsLoading(true);
    const res = await fetchUserFeedbacks();
    setFeedbacks(res.feedbacks || []);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = async (id: string, newStatus: UserFeedback['status']) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    );
    await updateFeedbackStatus(id, newStatus);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this feedback item?')) return;
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    await deleteFeedback(id);
  };

  const filteredFeedbacks = feedbacks.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchMsg = item.message?.toLowerCase().includes(q);
      const matchEmail = item.user_email?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchEmail) return false;
    }
    return true;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'bug':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
            <Bug className="w-3 h-3" /> Bug Report
          </span>
        );
      case 'feature':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold">
            <Lightbulb className="w-3 h-3" /> Feature Request
          </span>
        );
      case 'improvement':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
            <Sparkles className="w-3 h-3" /> Improvement
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
            <MessageSquare className="w-3 h-3" /> General
          </span>
        );
    }
  };

  const getStatusBadge = (status: UserFeedback['status'], id: string) => {
    return (
      <select
        value={status}
        onChange={(e) => handleStatusChange(id, e.target.value as UserFeedback['status'])}
        className={`text-[10px] font-semibold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer transition-colors ${
          status === 'resolved'
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            : status === 'reviewed'
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : 'bg-zinc-800 border-white/20 text-zinc-300'
        }`}
      >
        <option value="new" className="bg-[#111520] text-zinc-300">🟡 New</option>
        <option value="reviewed" className="bg-[#111520] text-amber-300">🟠 Reviewed</option>
        <option value="resolved" className="bg-[#111520] text-emerald-300">🟢 Resolved</option>
      </select>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in duration-150 backdrop-blur-xl text-white">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Admin Feedback Hub</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Prathmesh Sargar
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                User bug reports, feature requests, and feedback stored in database
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadFeedbacks}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Feedbacks"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-black/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, message, or user email..."
              className="w-full bg-transparent border-none text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px] font-semibold">Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All ({feedbacks.length})</option>
              <option value="bug">🐛 Bugs ({feedbacks.filter((f) => f.category === 'bug').length})</option>
              <option value="feature">💡 Features ({feedbacks.filter((f) => f.category === 'feature').length})</option>
              <option value="improvement">🚀 Improvements ({feedbacks.filter((f) => f.category === 'improvement').length})</option>
              <option value="general">⭐ General ({feedbacks.filter((f) => f.category === 'general').length})</option>
            </select>

            <span className="text-zinc-400 text-[11px] font-semibold ml-2">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="new">🟡 New</option>
              <option value="reviewed">🟠 Reviewed</option>
              <option value="resolved">🟢 Resolved</option>
            </select>
          </div>
        </div>

        {/* Feedback List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {isLoading && feedbacks.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
              Loading user feedback from database...
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
              <p className="font-semibold text-zinc-300">No feedback found</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {searchQuery || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'No items match your active filters.'
                  : 'Submitted feedback and bug reports from users will appear here.'}
              </p>
            </div>
          ) : (
            filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCategoryBadge(fb.category)}
                    <h4 className="text-sm font-bold text-white">{fb.title}</h4>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {getStatusBadge(fb.status, fb.id)}
                    <button
                      onClick={() => handleDelete(fb.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Feedback"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-text">
                  {fb.message}
                </p>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 select-none">
                  <div className="flex items-center gap-1.5">
                    <span>From:</span>
                    <a
                      href={`mailto:${fb.user_email}`}
                      className="text-amber-400 hover:underline font-mono"
                    >
                      {fb.user_email}
                    </a>
                    {fb.user_name && <span className="text-zinc-500">({fb.user_name})</span>}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(fb.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/20 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Total feedbacks: <strong className="text-white">{feedbacks.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white border border-white/10 cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
