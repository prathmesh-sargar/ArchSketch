export type SQLDataType = 
  | 'UUID'
  | 'VARCHAR(255)'
  | 'TEXT'
  | 'INT'
  | 'BIGINT'
  | 'SERIAL'
  | 'BOOLEAN'
  | 'TIMESTAMP'
  | 'JSONB'
  | 'NUMERIC(10,2)';

export interface ColumnDefinition {
  id: string;
  name: string;
  type: SQLDataType;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface TableNodeData {
  tableName: string;
  schema?: string;
  columns: ColumnDefinition[];
  color?: string;
  onAddColumn?: (tableId: string) => void;
  onDeleteColumn?: (tableId: string, colId: string) => void;
  onDeleteTable?: (tableId: string) => void;
  onRenameTable?: (tableId: string, newName: string) => void;
  [key: string]: unknown;
}

export interface ServiceNodeData {
  serviceName: string;
  type: 'api-gateway' | 'microservice' | 'cache' | 'queue' | 'db';
  techStack?: string;
  endpoints?: string[];
  onRenameService?: (serviceId: string, newName: string) => void;
  onDeleteService?: (serviceId: string) => void;
  [key: string]: unknown;
}

export interface NoteNodeData {
  title?: string;
  text: string;
  color?: string;
  onChangeText?: (nodeId: string, newText: string) => void;
  onRenameTitle?: (nodeId: string, newTitle: string) => void;
  onDeleteNote?: (nodeId: string) => void;
  [key: string]: unknown;
}

export interface ProjectTab {
  id: string;
  title: string;
  description?: string;
}

