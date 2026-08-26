export interface SqlMigrationScript {
  id: string;
  order: number;
  filename: string;
  category: string;
  description: string;
  sql: string;
}

export interface ConsistencyReviewItem {
  id: string;
  category: 'Missing Relationships' | 'Circular Dependencies' | 'Missing Indexes' | 'Duplicate Data' | 'Race Conditions' | 'Multi-Tenant Isolation' | 'Reporting Limitations' | 'Offline Synchronization';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  riskDescription: string;
  architecturalSolution: string;
  sqlPatternOrRule: string;
}

export interface DetailedPostgresTable {
  tableName: string;
  schemaGroup: 'IAM & Tenancy' | 'Catalog & UOM' | 'Suppliers & Procurement' | 'Inventory & Warehousing' | 'Sales & POS Registers' | 'Customers & Loyalty' | 'Sync & Idempotency' | 'Audit & Compliance';
  businessPurpose: string;
  primaryKey: string;
  foreignKeys: { column: string; references: string; onDelete: string; onUpdate: string }[];
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    defaultVal?: string;
    description: string;
    isPk?: boolean;
    isFk?: boolean;
    isUnique?: boolean;
    checkConstraint?: string;
  }[];
  uniqueConstraints: string[];
  checkConstraints: string[];
  indexes: { name: string; definition: string; purpose: string }[];
  relationships: string[];
  concurrencyControl: string;
  softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)' | 'Strictly Immutable (No Updates or Deletes)' | 'Hard Delete / State Enum';
  auditColumns: string;
  rlsPolicyDefinition: string;
}
