export interface SpecSection {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  badge: string;
  summary: string;
  subsections: SpecSubsection[];
}

export interface SpecSubsection {
  id: string;
  title: string;
  content: string;
  codeSnippets?: {
    language: string;
    filename?: string;
    code: string;
  }[];
  tables?: {
    headers: string[];
    rows: string[][];
  }[];
  callouts?: {
    type: 'info' | 'warning' | 'critical' | 'success';
    title: string;
    message: string;
  }[];
}

export interface DbTableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  description: string;
  defaultVal?: string;
}

export interface DbTable {
  name: string;
  category: 'Core & Auth' | 'Catalog & Pricing' | 'Inventory & Purchasing' | 'Sales & POS' | 'Customers & Loyalty' | 'Sync & Audit';
  purpose: string;
  primaryKey: string;
  columns: DbTableColumn[];
  indexes: string[];
  uniqueConstraints: string[];
  relationships: string[];
  softDelete: string;
  auditFields: string;
}

export interface SyncStep {
  stepNumber: number;
  name: string;
  actor: 'Client' | 'Network' | 'Server';
  action: string;
  status: 'idle' | 'in-flight' | 'validated' | 'committed' | 'merged';
  payloadExample: Record<string, unknown>;
  conflictResolutionNote?: string;
}
