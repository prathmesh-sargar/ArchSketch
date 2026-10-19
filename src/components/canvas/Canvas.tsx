import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import { TableNode } from '../nodes/TableNode';
import { ServiceNode } from '../nodes/ServiceNode';
import { NoteNode } from '../nodes/NoteNode';
import { TableNodeData, ServiceNodeData, NoteNodeData, ColumnDefinition, SQLDataType } from '../../types/schema';
import { Trash2, X, Plus } from 'lucide-react';

interface CanvasProps {
  isDarkMode: boolean;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onAddTableRef?: (addFn: () => void) => void;
  onAddServiceRef?: (addFn: () => void) => void;
  onAddNoteRef?: (addFn: () => void) => void;
  onApplyAISchemaRef?: (applyFn: (tables: { name: string; columns: { name: string; type: SQLDataType; isPrimaryKey?: boolean; isForeignKey?: boolean }[] }[]) => void) => void;
  onNodesEdgesChange?: (nodes: Node[], edges: Edge[]) => void;
}

const DATA_TYPES: SQLDataType[] = [
  'UUID',
  'VARCHAR(255)',
  'TEXT',
  'INT',
  'BIGINT',
  'BOOLEAN',
  'TIMESTAMP',
  'JSONB',
  'NUMERIC(10,2)',
];

const DEFAULT_NODES: Node[] = [
  {
    id: 'users-table',
    type: 'tableNode',
    position: { x: 80, y: 120 },
    data: {
      tableName: 'users',
      schema: 'public',
      columns: [
        { id: '1', name: 'id', type: 'UUID', isPrimaryKey: true },
        { id: '2', name: 'email', type: 'VARCHAR(255)', isUnique: true },
        { id: '3', name: 'full_name', type: 'VARCHAR(255)', isNullable: true },
        { id: '4', name: 'created_at', type: 'TIMESTAMP' },
      ],
    },
  },
  {
    id: 'orders-table',
    type: 'tableNode',
    position: { x: 500, y: 120 },
    data: {
      tableName: 'orders',
      schema: 'public',
      columns: [
        { id: '10', name: 'id', type: 'UUID', isPrimaryKey: true },
        { id: '11', name: 'user_id', type: 'UUID', isForeignKey: true },
        { id: '12', name: 'total_amount', type: 'NUMERIC(10,2)' },
        { id: '13', name: 'status', type: 'VARCHAR(255)' },
        { id: '14', name: 'created_at', type: 'TIMESTAMP' },
      ],
    },
  },
];

const DEFAULT_EDGES: Edge[] = [
  {
    id: 'e-users-orders',
    source: 'users-table',
    target: 'orders-table',
    sourceHandle: 'col-out-1',
    targetHandle: 'col-in-11',
    animated: true,
    style: { stroke: '#fbbf24', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
  },
];

export const Canvas: React.FC<CanvasProps> = ({
  isDarkMode,
  initialNodes,
  initialEdges,
  onAddTableRef,
  onAddServiceRef,
  onAddNoteRef,
  onApplyAISchemaRef,
  onNodesEdgesChange,
}) => {
  // Modal state for adding a new column to a specific table
  const [activeTableForCol, setActiveTableForCol] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<SQLDataType>('VARCHAR(255)');
  const [newColIsPK, setNewColIsPK] = useState(false);
  const [newColIsFK, setNewColIsFK] = useState(false);
  const [newColIsNullable, setNewColIsNullable] = useState(false);

  // Selected edge modal / popover
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Initial nodes
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    initialNodes && initialNodes.length > 0 ? initialNodes : DEFAULT_NODES
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges && initialEdges.length > 0 ? initialEdges : DEFAULT_EDGES
  );

  // Actions on Tables & Columns
  const handleOpenAddColumnModal = useCallback((tableId: string) => {
    setActiveTableForCol(tableId);
    setNewColName('');
    setNewColType('VARCHAR(255)');
    setNewColIsPK(false);
    setNewColIsFK(false);
    setNewColIsNullable(false);
  }, []);

  const handleConfirmAddColumn = () => {
    if (!activeTableForCol || !newColName.trim()) return;

    const newCol: ColumnDefinition = {
      id: String(Date.now()),
      name: newColName.trim(),
      type: newColType,
      isPrimaryKey: newColIsPK,
      isForeignKey: newColIsFK,
      isNullable: newColIsNullable,
    };

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === activeTableForCol) {
          const tData = n.data as TableNodeData;
          return {
            ...n,
            data: {
              ...tData,
              columns: [...tData.columns, newCol],
            },
          };
        }
        return n;
      })
    );

    setActiveTableForCol(null);
  };

  const handleDeleteColumn = useCallback((tableId: string, colId: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === tableId) {
          const tData = n.data as TableNodeData;
          return {
            ...n,
            data: {
              ...tData,
              columns: tData.columns.filter((c) => c.id !== colId),
            },
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  const handleDeleteTable = useCallback((tableId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== tableId));
    setEdges((eds) => eds.filter((e) => e.source !== tableId && e.target !== tableId));
  }, [setNodes, setEdges]);

  const handleRenameTable = useCallback((tableId: string, newName: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === tableId ? { ...n, data: { ...n.data, tableName: newName } } : n
      )
    );
  }, [setNodes]);

  const handleRenameService = useCallback((serviceId: string, newName: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === serviceId ? { ...n, data: { ...n.data, serviceName: newName } } : n
      )
    );
  }, [setNodes]);

  const handleDeleteService = useCallback((serviceId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== serviceId));
    setEdges((eds) => eds.filter((e) => e.source !== serviceId && e.target !== serviceId));
  }, [setNodes, setEdges]);

  const handleRenameNoteTitle = useCallback((noteId: string, newTitle: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === noteId ? { ...n, data: { ...n.data, title: newTitle } } : n
      )
    );
  }, [setNodes]);

  const handleChangeNoteText = useCallback((noteId: string, newText: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === noteId ? { ...n, data: { ...n.data, text: newText } } : n
      )
    );
  }, [setNodes]);

  const handleDeleteNote = useCallback((noteId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== noteId));
  }, [setNodes]);

  // Expose Add Table, Service, Note, and AI Schema handlers
  const handleAddNewTable = useCallback(() => {
    const tableIndex = nodes.filter((n) => n.type === 'tableNode').length + 1;
    const newId = `table-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'tableNode',
      position: { x: 120 + (tableIndex * 35), y: 150 + (tableIndex * 25) },
      data: {
        tableName: `table_${tableIndex}`,
        schema: 'public',
        columns: [
          { id: `${Date.now()}-1`, name: 'id', type: 'UUID', isPrimaryKey: true },
          { id: `${Date.now()}-2`, name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const handleAddNewService = useCallback(() => {
    const serviceIndex = nodes.filter((n) => n.type === 'serviceNode').length + 1;
    const newId = `service-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'serviceNode',
      position: { x: 200 + (serviceIndex * 30), y: 420 },
      data: {
        serviceName: `Service ${serviceIndex}`,
        type: 'microservice',
        techStack: 'Node / Express',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const handleAddNewNote = useCallback(() => {
    const newId = `note-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'noteNode',
      position: { x: 100, y: 350 },
      data: {
        title: 'Architecture Note',
        text: 'Document design choices, security constraints, or API models here...',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleApplyAISchema = useCallback((tables: { name: string; columns: { name: string; type: SQLDataType; isPrimaryKey?: boolean; isForeignKey?: boolean }[] }[]) => {
    const newGeneratedNodes: Node[] = tables.map((t, i) => ({
      id: `ai-${t.name}-${Date.now()}-${i}`,
      type: 'tableNode',
      position: { x: 100 + (i * 340), y: 140 + ((i % 2) * 40) },
      data: {
        tableName: t.name,
        schema: 'public',
        columns: t.columns.map((c, idx) => ({
          id: `${Date.now()}-${i}-${idx}`,
          name: c.name,
          type: c.type,
          isPrimaryKey: c.isPrimaryKey,
          isForeignKey: c.isForeignKey,
        })),
      },
    }));

    setNodes((existing) => [...existing, ...newGeneratedNodes]);
  }, [setNodes]);

  React.useEffect(() => {
    onAddTableRef?.(handleAddNewTable);
    onAddServiceRef?.(handleAddNewService);
    onAddNoteRef?.(handleAddNewNote);
    onApplyAISchemaRef?.(handleApplyAISchema);
  }, [onAddTableRef, onAddServiceRef, onAddNoteRef, onApplyAISchemaRef, handleAddNewTable, handleAddNewService, handleAddNewNote, handleApplyAISchema]);

  // Notify parent of latest nodes and edges for auto-persistence (skip initial mount)
  const isMountedRef = useRef(false);
  React.useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    onNodesEdgesChange?.(nodes, edges);
  }, [nodes, edges, onNodesEdgesChange]);

  // Inject action callbacks into nodes data
  const decoratedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'tableNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onAddColumn: handleOpenAddColumnModal,
            onDeleteColumn: handleDeleteColumn,
            onDeleteTable: handleDeleteTable,
            onRenameTable: handleRenameTable,
          },
        };
      }
      if (node.type === 'serviceNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onRenameService: handleRenameService,
            onDeleteService: handleDeleteService,
          },
        };
      }
      if (node.type === 'noteNode') {
        return {
          ...node,
          data: {
            ...node.data,
            title: (node.data as { title?: string }).title || 'Architecture Note',
            onRenameTitle: handleRenameNoteTitle,
            onChangeText: handleChangeNoteText,
            onDeleteNote: handleDeleteNote,
          },
        };
      }
      return node;
    });
  }, [nodes, handleOpenAddColumnModal, handleDeleteColumn, handleDeleteTable, handleRenameTable, handleRenameService, handleDeleteService, handleRenameNoteTitle, handleChangeNoteText, handleDeleteNote]);

  const nodeTypes = useMemo(
    () => ({
      tableNode: TableNode,
      serviceNode: ServiceNode,
      noteNode: NoteNode,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: isDarkMode ? '#38bdf8' : '#0284c7', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isDarkMode ? '#38bdf8' : '#0284c7',
            },
          },
          eds
        )
      ),
    [setEdges, isDarkMode]
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
  }, []);

  const handleDeleteSelectedEdge = () => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  };

  const handleToggleEdgeAnimation = () => {
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === selectedEdge.id ? { ...e, animated: !e.animated } : e
        )
      );
      setSelectedEdge((prev) => (prev ? { ...prev, animated: !prev.animated } : null));
    }
  };

  return (
    <div className="w-full h-screen bg-background transition-colors">
      <ReactFlow
        nodes={decoratedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDarkMode ? '#30363d' : '#cbd5e1'}
        />
        <Controls className="!bg-card !border-border !rounded-xl !shadow-xl overflow-hidden fill-foreground" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-card !border-border !rounded-xl !shadow-xl overflow-hidden"
          maskColor={isDarkMode ? 'rgba(13, 17, 23, 0.7)' : 'rgba(241, 245, 249, 0.7)'}
        />
      </ReactFlow>

      {/* Edge Inspector / Deletion Modal */}
      {selectedEdge && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-5 py-3 bg-card border border-border rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-mono text-muted-foreground">
            Connection: <strong className="text-foreground">{selectedEdge.source}</strong> ➔ <strong className="text-foreground">{selectedEdge.target}</strong>
          </span>
          <button
            onClick={handleToggleEdgeAnimation}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
          >
            {selectedEdge.animated ? 'Static' : 'Animate'}
          </button>
          <button
            onClick={handleDeleteSelectedEdge}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Connection</span>
          </button>
          <button
            onClick={() => setSelectedEdge(null)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Column Modal */}
      {activeTableForCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Add New Column</h3>
              <button
                onClick={() => setActiveTableForCol(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Column Name</label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="e.g. phone_number"
                  className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data Type</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as SQLDataType)}
                  className="w-full bg-background dark:bg-[#161b22] text-foreground dark:text-[#f0f6fc] border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono"
                >
                  {DATA_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-card dark:bg-[#161b22] text-foreground dark:text-[#f0f6fc] py-1">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-1.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newColIsPK}
                    onChange={(e) => setNewColIsPK(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span>Primary Key</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newColIsFK}
                    onChange={(e) => setNewColIsFK(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  <span>Foreign Key</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newColIsNullable}
                    onChange={(e) => setNewColIsNullable(e.target.checked)}
                    className="rounded"
                  />
                  <span>Nullable</span>
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setActiveTableForCol(null)}
                className="px-3 py-1.5 rounded-xl bg-muted text-xs font-medium text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddColumn}
                disabled={!newColName.trim()}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-xs font-semibold text-black cursor-pointer"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
