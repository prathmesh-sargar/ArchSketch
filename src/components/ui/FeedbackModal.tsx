import React, { useState } from 'react';
import { X, Send, MessageSquare, Bug, Lightbulb, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitUserFeedback, UserFeedback } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [category, setCategory] = useState<UserFeedback['category']>('bug');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide your feedback or report description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Auto-generate a clean summary title from the first line or sentence
    const firstLine = description.trim().split('\n')[0];
    const derivedTitle = firstLine.length > 70 ? firstLine.slice(0, 67) + '...' : firstLine;

    const userEmail = currentUser?.email || 'authenticated-user@archsketch.app';
    const userName = currentUser?.user_metadata?.full_name || userEmail.split('@')[0];

    const res = await submitUserFeedback({
      user_id: currentUser?.id,
      user_email: userEmail,
      user_name: userName,
      category,
      title: derivedTitle,
      message: description.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setDescription('');
        onClose();
      }, 2000);
    } else {
      setError(res.error || 'Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111520]/95 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in duration-150 backdrop-blur-xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Send Feedback</h3>
            <p className="text-xs text-zinc-400">Share your thoughts or report an issue</p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Feedback Received!</h4>
            <p className="text-xs text-zinc-300 max-w-xs">
              Thank you for helping us improve ArchSketch.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Feedback Type Tabs */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Feedback Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('bug')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === 'bug'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Bug</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('feature')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === 'feature'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Feature</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('improvement')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === 'improvement'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Idea</span>
                </button>
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Description
                </label>
                {currentUser?.email && (
                  <span className="text-[10px] text-zinc-400 truncate max-w-[200px]" title={currentUser.email}>
                    as <span className="text-zinc-300 font-mono">{currentUser.email}</span>
                  </span>
                )}
              </div>
              <textarea
                rows={5}
                required
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened or what improvement would you like to see? Tell us here..."
                className="w-full bg-black/40 border border-white/20 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white border border-white/15 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-xs font-bold text-black flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending...' : 'Send Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
