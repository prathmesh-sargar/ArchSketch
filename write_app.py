import os

app_content = """import { useState } from 'react';
import { Canvas } from './components/canvas/Canvas';
import { Header } from './components/ui/Header';

export function App() {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      <Header
        onExportSQL={() => setShowExportModal(true)}
        onAskAI={() => setShowAIModal(true)}
      />
      <Canvas />

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#f0f6fc] mb-2">Generated PostgreSQL Schema</h3>
            <p className="text-xs text-[#8b949e] mb-4">Exported from your interactive canvas ER diagram:</p>
            <pre className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-60">
{`CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "full_name" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "total_amount" NUMERIC(10,2) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
            </pre>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-[#c9d1d9] cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-[#0d1117] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#f0f6fc] mb-2">AI System & Schema Generator</h3>
            <p className="text-xs text-[#8b949e] mb-4">
              Prompt an architecture or database structure (e.g., "Build a high-scale Uber backend with geolocation indexing"):
            </p>
            <textarea
              rows={3}
              placeholder="Describe your system architecture or tables..."
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-purple-500 rounded-xl p-3 text-xs text-[#f0f6fc] focus:outline-none resize-none"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-3 py-1.5 rounded-xl bg-[#21262d] text-xs font-medium text-[#c9d1d9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-medium text-white shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                Generate Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
"""

header_content = """import React from 'react';
import { Layers, Sparkles, Download, Share2 } from 'lucide-react';

interface HeaderProps {
  onExportSQL: () => void;
  onAskAI: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onExportSQL, onAskAI }) => {
  return (
    <header className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between px-6 py-3 bg-[#161b22]/85 backdrop-blur-md border border-[#30363d] rounded-2xl shadow-2xl">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-[#0d1117] shadow-lg shadow-amber-500/20">
          <Layers className="w-5 h-5 font-bold" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-[#f0f6fc] flex items-center space-x-2">
            <span>ArchSketch</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              Beta
            </span>
          </h1>
          <p className="text-[11px] text-[#8b949e]">
            Interactive System Design & Database ERD Canvas
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onAskAI}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs transition-all shadow-lg shadow-purple-500/20 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Architect</span>
        </button>

        <button
          onClick={onExportSQL}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] font-medium text-xs transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export SQL</span>
        </button>

        <button
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#f0f6fc] font-medium text-xs transition-all active:scale-95 cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-blue-400" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
};
"""

with open('D:/archsketch/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_content)

with open('D:/archsketch/src/components/ui/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(header_content)

table_content = """import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Key, Hash, Calendar, ToggleLeft, FileText, Database, Plus } from 'lucide-react';
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

export const TableNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const tableData = data as unknown as TableNodeData;

  return (
    <div className={'rounded-xl overflow-hidden bg-[#161b22] border-2 transition-all duration-200 shadow-2xl min-w-[280px] max-w-[340px] ' + (selected ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-[#30363d] hover:border-[#8b949e]')}>
      <div className="bg-gradient-to-r from-[#21262d] to-[#161b22] p-3 border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#f0f6fc] tracking-wide">{tableData.tableName}</h3>
            {tableData.schema && <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">{tableData.schema}</span>}
          </div>
        </div>
        <span className="text-[11px] font-mono text-[#8b949e] px-2 py-0.5 rounded-full bg-[#0d1117] border border-[#30363d]">{tableData.columns.length} cols</span>
      </div>
      <div className="divide-y divide-[#21262d] bg-[#0d1117]/60">
        {tableData.columns.map((col) => (
          <div key={col.id} className="relative px-3 py-2 flex items-center justify-between hover:bg-[#1f242c] transition-colors group">
            <Handle type="target" position={Position.Left} id={'col-in-' + col.id} className="!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-[#0d1117] hover:scale-125 transition-transform" />
            <div className="flex items-center space-x-2 min-w-0 pr-2">
              {col.isPrimaryKey ? <Key className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" /> : <span className="shrink-0">{getTypeIcon(col.type)}</span>}
              <span className={'text-xs truncate font-mono ' + (col.isPrimaryKey ? 'font-bold text-amber-200' : 'text-[#c9d1d9]')}>{col.name}</span>
              {col.isForeignKey && <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">FK</span>}
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-[10px] font-mono text-[#8b949e] uppercase">{col.type}</span>
              {col.isNullable && <span className="text-[9px] text-[#484f58] font-mono" title="Nullable">?</span>}
            </div>
            <Handle type="source" position={Position.Right} id={'col-out-' + col.id} className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-[#0d1117] hover:scale-125 transition-transform" />
          </div>
        ))}
      </div>
      <div className="p-2 bg-[#161b22] border-t border-[#30363d] flex items-center justify-center">
        <button className="flex items-center space-x-1.5 text-xs text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] px-3 py-1 rounded-md transition-colors w-full justify-center font-medium">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Column</span>
        </button>
      </div>
    </div>
  );
});
"""

service_content = """import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Server, Cpu, HardDrive, Layers, ArrowLeftRight } from 'lucide-react';
import { ServiceNodeData } from '../../types/schema';

export const ServiceNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const serviceData = data as unknown as ServiceNodeData;

  const getServiceIcon = () => {
    switch (serviceData.type) {
      case 'api-gateway':
        return <ArrowLeftRight className="w-5 h-5 text-indigo-400" />;
      case 'cache':
        return <Cpu className="w-5 h-5 text-emerald-400" />;
      case 'queue':
        return <Layers className="w-5 h-5 text-orange-400" />;
      case 'db':
        return <HardDrive className="w-5 h-5 text-cyan-400" />;
      default:
        return <Server className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className={'rounded-2xl p-4 bg-[#161b22] border-2 shadow-2xl min-w-[220px] transition-all duration-200 ' + (selected ? 'border-purple-400 ring-4 ring-purple-400/20' : 'border-[#30363d] hover:border-[#8b949e]')}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-[#0d1117]" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-[#0d1117]" />
      <div className="flex items-center space-x-3 mb-2">
        <div className="p-2.5 rounded-xl bg-[#21262d] border border-[#30363d]">{getServiceIcon()}</div>
        <div>
          <h4 className="font-bold text-sm text-[#f0f6fc]">{serviceData.serviceName}</h4>
          <span className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">{serviceData.type}</span>
        </div>
      </div>
      {serviceData.techStack && (
        <div className="mt-2 pt-2 border-t border-[#21262d] flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
          <span>Stack:</span>
          <span className="text-purple-300 font-semibold">{serviceData.techStack}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-[#0d1117]" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-[#0d1117]" />
    </div>
  );
});
"""

with open('D:/archsketch/src/components/nodes/TableNode.tsx', 'w', encoding='utf-8') as f:
    f.write(table_content)

with open('D:/archsketch/src/components/nodes/ServiceNode.tsx', 'w', encoding='utf-8') as f:
    f.write(service_content)

print('All 4 files written successfully!')

