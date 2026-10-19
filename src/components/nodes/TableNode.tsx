import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Key, Hash, Calendar, ToggleLeft, FileText, Database, Plus, Trash2, X } from 'lucide-react';
import { TableNodeData, SQLDataType } from '../../types/schema';

const getTypeIcon = (type: SQLDataType) => {
  if (type.includes('INT') || type.includes('NUMERIC') || type.includes('SERIAL')) {
    return <Hash className="w-3.5 h-3.5 text-blue-400" />;
  }
  if (type.includes('TIME')) {
    return <Calendar className="w-3.5 h-3.5 text-yellow-400" />;
  }
  if (type === 'BOOLEAN') {
    return <ToggleLeft className="w-3.5 h-3.5 text-green-400" />;
  }
  return <FileText className="w-3.5 h-3.5 text-purple-400" />;
};

export const TableNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const tableData = data as unknown as TableNodeData;

  return (
    <div className={'rounded-xl overflow-hidden bg-card border-2 transition-all duration-200 shadow-2xl min-w-[280px] max-w-[340px] ' + (selected ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-border hover:border-muted-foreground/40')}>
      {/* Header */}
      <div className="bg-muted/50 p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={tableData.tableName}
                onChange={(e) => tableData.onRenameTable?.(id, e.target.value)}
                className="font-bold text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-amber-400 focus:outline-none px-1 py-0.5 rounded transition-all w-[150px]"
                title="Click to rename table"
              />
            </div>
            {tableData.schema && <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider ml-1">{tableData.schema}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded-full bg-background border border-border">
            {tableData.columns.length} cols
          </span>
          {tableData.onDeleteTable && (
            <button
              onClick={() => tableData.onDeleteTable?.(id)}
              className="text-muted-foreground hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
              title="Delete table"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Columns */}
      <div className="divide-y divide-border/60 bg-background/50">
        {tableData.columns.map((col) => (
          <div key={col.id} className="relative px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors group">
            <Handle type="target" position={Position.Left} id={'col-in-' + col.id} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-background hover:scale-125 transition-transform" />
            
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              {col.isPrimaryKey ? <Key className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" /> : <span className="shrink-0">{getTypeIcon(col.type)}</span>}
              <span className={'text-xs truncate font-mono ' + (col.isPrimaryKey ? 'font-bold text-amber-300' : 'text-foreground')}>{col.name}</span>
              {col.isForeignKey && <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">FK</span>}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{col.type}</span>
              {col.isNullable && <span className="text-[9px] text-muted-foreground/60 font-mono" title="Nullable">?</span>}
              {tableData.onDeleteColumn && tableData.columns.length > 1 && (
                <button
                  onClick={() => tableData.onDeleteColumn?.(id, col.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-0.5 rounded transition-opacity"
                  title="Remove column"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Handle type="source" position={Position.Right} id={'col-out-' + col.id} className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-background hover:scale-125 transition-transform" />
          </div>
        ))}
      </div>

      {/* Footer / Add Column */}
      <div className="p-2 bg-card border-t border-border flex items-center justify-center">
        <button
          onClick={() => tableData.onAddColumn?.(id)}
          className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-md transition-colors w-full justify-center font-medium cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Column</span>
        </button>
      </div>
    </div>
  );
});
