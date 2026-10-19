import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Server, Cpu, HardDrive, Layers, ArrowLeftRight, Trash2 } from 'lucide-react';
import { ServiceNodeData } from '../../types/schema';

export const ServiceNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
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
    <div className={'rounded-2xl p-4 bg-card border-2 shadow-2xl min-w-[240px] transition-all duration-200 ' + (selected ? 'border-purple-400 ring-4 ring-purple-400/20' : 'border-border hover:border-muted-foreground/40')}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-400 !border-2 !border-background" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-muted border border-border">{getServiceIcon()}</div>
          <div>
            <input
              type="text"
              value={serviceData.serviceName}
              onChange={(e) => serviceData.onRenameService?.(id, e.target.value)}
              className="font-bold text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-purple-400 focus:outline-none px-1 py-0.5 rounded transition-all w-[130px]"
              title="Click to rename service"
            />
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block ml-1">{serviceData.type}</span>
          </div>
        </div>

        {serviceData.onDeleteService && (
          <button
            onClick={() => serviceData.onDeleteService?.(id)}
            className="text-muted-foreground hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
            title="Delete service"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {serviceData.techStack && (
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Stack:</span>
          <span className="text-purple-400 font-semibold">{serviceData.techStack}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-background" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-background" />
    </div>
  );
});
