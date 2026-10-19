import React, { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { StickyNote, Trash2 } from 'lucide-react';
import { NoteNodeData } from '../../types/schema';

export const NoteNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const noteData = data as unknown as NoteNodeData;

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border transition-all duration-200 min-w-[260px] max-w-[340px] bg-[#16130d]/95 backdrop-blur-md border-amber-500/40 ${
        selected ? 'ring-2 ring-amber-400 border-amber-400' : 'hover:border-amber-400/60'
      }`}
    >
      {/* Note Header with Editable Title */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
        <div className="flex items-center space-x-2 flex-1 mr-2">
          <StickyNote className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="text"
            value={noteData.title || ''}
            onChange={(e) => noteData.onRenameTitle?.(id, e.target.value)}
            placeholder="Note Title..."
            className="w-full bg-transparent font-bold text-xs uppercase tracking-wider text-amber-400 placeholder-amber-400/50 focus:outline-none focus:border-b focus:border-amber-400 transition-colors"
          />
        </div>
        {noteData.onDeleteNote && (
          <button
            onClick={() => noteData.onDeleteNote?.(id)}
            className="text-amber-400/60 hover:text-red-400 p-1 rounded-lg hover:bg-red-400/10 transition-colors cursor-pointer shrink-0"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Note Content Textarea with Clean Custom Scrollbar */}
      <textarea
        value={noteData.text}
        onChange={(e) => noteData.onChangeText?.(id, e.target.value)}
        rows={5}
        placeholder="Write architectural notes, API contracts, schema decisions, or scaling rules..."
        className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-400/70 focus:outline-none resize-none leading-relaxed overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-transparent pr-1"
      />
    </div>
  );
});
