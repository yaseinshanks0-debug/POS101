import { DetailedPostgresTable } from '../types/databaseTypes';

export const detailedPostgresTables: DetailedPostgresTable[] = [
  // 1. TENANTS
  {
    tableName: 'tenants',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Root isolation entity representing a business organization or franchise operator.',
    primaryKey: 'id (UUID)',
    foreignKeys: [],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Primary key UUIDv7/v4', isPk: true },
      { name: 'code', type: 'VARCHAR(32)', nullable: false, description: 'Unique tenant slug / identifier', isUnique: true },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Legal trading business name' },
      { name: 'tax_number', type: 'VARCHAR(64)', nullable: true, description: 'National VAT/GST tax identification number' },
      { name: 'currency_code', type: 'CHAR(3)', nullable: false, defaultVal: "'USD'", description: 'ISO-4217 standard default currency code' },
      { name: 'timezone', type: 'VARCHAR(64)', nullable: false, defaultVal: "'UTC'", description: 'IANA standard timezone' },
      { name: 'status', type: 'tenant_status_enum', nullable: false, defaultVal: "'ACTIVE'", description: 'ACTIVE, SUSPENDED, TRIAL' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Creation timestamp with timezone' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Trigger-managed last update timestamp' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft-deletion timestamp if cancelled' }
    ],
    uniqueConstraints: ['uq_tenants_code UNIQUE (code)'],
    checkConstraints: ["chk_tenants_currency_len CHECK (length(currency_code) = 3)"],
    indexes: [
      { name: 'idx_tenants_code', definition: 'CREATE UNIQUE INDEX idx_tenants_code ON tenants(code) WHERE deleted_at IS NULL;', purpose: 'Fast tenant resolution by subdomain / header slug' },
      { name: 'idx_tenants_status', definition: 'CREATE INDEX idx_tenants_status ON tenants(status);', purpose: 'Filter active tenants' }
    ],
    relationships: ['1:N with stores', '1:N with warehouses', '1:N with users', '1:N with all tenant-partitioned entities'],
    concurrencyControl: 'Optimistic locking via version column increment.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'N/A (Root catalog table; protected via IAM system admin context).'
  },

  // 2. STORES
  {
    tableName: 'stores',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Physical retail branch locations or online storefronts that conduct POS operations.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Store UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant foreign key for strict tenancy isolation', isFk: true },
      { name: 'code', type: 'VARCHAR(32)', nullable: false, description: 'Store code (e.g., ST-001, NYC-DOWNTOWN)' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Friendly retail store name' },
      { name: 'address_line1', type: 'VARCHAR(255)', nullable: true, description: 'Physical street address line 1' },
      { name: 'address_line2', type: 'VARCHAR(255)', nullable: true, description: 'Suite, floor, or building unit' },
      { name: 'city', type: 'VARCHAR(100)', nullable: true, description: 'City name' },
      { name: 'state', type: 'VARCHAR(100)', nullable: true, description: 'State or province' },
      { name: 'postal_code', type: 'VARCHAR(20)', nullable: true, description: 'Postal / ZIP code' },
      { name: 'country_code', type: 'CHAR(2)', nullable: false, defaultVal: "'US'", description: 'ISO 3166-1 alpha-2 country code' },
      { name: 'phone', type: 'VARCHAR(32)', nullable: true, description: 'Store contact telephone' },
      { name: 'receipt_header_text', type: 'TEXT', nullable: true, description: 'Custom printed header on ESC/POS thermal receipts' },
      { name: 'receipt_footer_text', type: 'TEXT', nullable: true, description: 'Custom printed footer (return policies, greetings)' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Store operational status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated timestamp' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft-deletion timestamp' }
    ],
    uniqueConstraints: ['uq_stores_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_stores_tenant_code', definition: 'CREATE UNIQUE INDEX idx_stores_tenant_code ON stores(tenant_id, code) WHERE deleted_at IS NULL;', purpose: 'Enforce store code uniqueness per tenant' },
      { name: 'idx_stores_tenant_active', definition: 'CREATE INDEX idx_stores_tenant_active ON stores(tenant_id, is_active) WHERE deleted_at IS NULL;', purpose: 'Fast active store filtering for POS login' }
    ],
    relationships: ['N:1 with tenants', '1:N with registers', '1:N with warehouses', '1:N with sales_orders'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 3. WAREHOUSES
  {
    tableName: 'warehouses',
    schemaGroup: 'Inventory & Warehousing',
    businessPurpose: 'Physical or virtual inventory holding locations (store backrooms, central distribution centers, transit hubs).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'store_id', references: 'stores(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Warehouse UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'store_id', type: 'UUID', nullable: true, description: 'Optional associated store (if warehouse is a store stockroom)', isFk: true },
      { name: 'code', type: 'VARCHAR(32)', nullable: false, description: 'Warehouse code (e.g., WH-MAIN, STORE-01-BACK)' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Warehouse facility name' },
      { name: 'type', type: 'warehouse_type_enum', nullable: false, defaultVal: "'STORE_FRONT'", description: 'STORE_FRONT, STORE_BACKROOM, CENTRAL_DC, TRANSIT, QUARANTINE' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active warehouse status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Update timestamp' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft-deletion timestamp' }
    ],
    uniqueConstraints: ['uq_warehouses_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_warehouses_tenant_store', definition: 'CREATE INDEX idx_warehouses_tenant_store ON warehouses(tenant_id, store_id) WHERE deleted_at IS NULL;', purpose: 'Lookup stockrooms belonging to a specific store' },
      { name: 'idx_warehouses_tenant_code', definition: 'CREATE UNIQUE INDEX idx_warehouses_tenant_code ON warehouses(tenant_id, code) WHERE deleted_at IS NULL;', purpose: 'Warehouse code uniqueness per tenant' }
    ],
    relationships: ['N:1 with tenants', 'N:1 with stores', '1:N with inventory_ledgers', '1:N with stock_transfers'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 4. REGISTERS
  {
    tableName: 'registers',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Point of sale hardware/client terminal instances registered under a store.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'store_id', references: 'stores(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'default_warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Register terminal UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'store_id', type: 'UUID', nullable: false, description: 'Store foreign key', isFk: true },
      { name: 'default_warehouse_id', type: 'UUID', nullable: false, description: 'Default warehouse for automatic stock deduction', isFk: true },
      { name: 'code', type: 'VARCHAR(32)', nullable: false, description: 'Register code (e.g. REG-01, LANE-04)' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Terminal label (e.g. Front Counter iPad 1)' },
      { name: 'device_identifier', type: 'VARCHAR(128)', nullable: true, description: 'Hardware unique ID / MAC address / Client fingerprint' },
      { name: 'printer_ip_address', type: 'VARCHAR(45)', nullable: true, description: 'Default ESC/POS Network IP (if configured)' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Terminal authorization flag' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_registers_store_code UNIQUE (store_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_registers_tenant_store', definition: 'CREATE INDEX idx_registers_tenant_store ON registers(tenant_id, store_id) WHERE deleted_at IS NULL;', purpose: 'Fetch terminal list during store device setup' }
    ],
    relationships: ['N:1 with stores', 'N:1 with warehouses', '1:N with shifts', '1:N with sales_orders'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 5. USERS
  {
    tableName: 'users',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Staff, cashiers, store managers, and corporate administrators.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'primary_store_id', references: 'stores(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'User UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant foreign key', isFk: true },
      { name: 'primary_store_id', type: 'UUID', nullable: true, description: 'Default assigned retail branch', isFk: true },
      { name: 'username', type: 'VARCHAR(64)', nullable: false, description: 'Login username' },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, description: 'Contact email' },
      { name: 'first_name', type: 'VARCHAR(100)', nullable: false, description: 'Given name' },
      { name: 'last_name', type: 'VARCHAR(100)', nullable: false, description: 'Family name' },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, description: 'Argon2id password hash for portal login' },
      { name: 'pin_hash', type: 'VARCHAR(255)', nullable: true, description: 'Argon2id 4-6 digit fast-switching PIN hash for POS register' },
      { name: 'phone', type: 'VARCHAR(32)', nullable: true, description: 'Contact telephone' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Login authorization status' },
      { name: 'last_login_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Last authentication timestamp' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_users_tenant_username UNIQUE (tenant_id, username)', 'uq_users_tenant_email UNIQUE (tenant_id, email)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_users_tenant_username', definition: 'CREATE UNIQUE INDEX idx_users_tenant_username ON users(tenant_id, username) WHERE deleted_at IS NULL;', purpose: 'Fast authentication lookup by username' },
      { name: 'idx_users_tenant_email', definition: 'CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;', purpose: 'Fast authentication lookup by email' },
      { name: 'idx_users_tenant_store', definition: 'CREATE INDEX idx_users_tenant_store ON users(tenant_id, primary_store_id) WHERE deleted_at IS NULL;', purpose: 'Staff listing by branch store' }
    ],
    relationships: ['N:1 with tenants', 'N:M with roles via user_roles', '1:N with shifts', '1:N with sales_orders'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 6. ROLES
  {
    tableName: 'roles',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Role definitions (Cashier, Supervisor, Store Manager, Inventory Auditor, Admin).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Role UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'code', type: 'VARCHAR(64)', nullable: false, description: 'Role code (e.g. CASHIER, STORE_MANAGER)' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Display name' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Role scope and responsibilities' },
      { name: 'is_system_role', type: 'BOOLEAN', nullable: false, defaultVal: 'FALSE', description: 'System role protected from deletion' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: ['uq_roles_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_roles_tenant_code', definition: 'CREATE UNIQUE INDEX idx_roles_tenant_code ON roles(tenant_id, code);', purpose: 'Enforce unique role codes per tenant' }
    ],
    relationships: ['1:N with role_permissions', 'N:M with users via user_roles'],
    concurrencyControl: 'Row update via updated_at trigger.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 7. PERMISSIONS
  {
    tableName: 'permissions',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Global static permission matrix (e.g. pos:order:discount, inventory:adjustment:create).',
    primaryKey: 'id (UUID)',
    foreignKeys: [],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Permission UUID', isPk: true },
      { name: 'key', type: 'VARCHAR(128)', nullable: false, description: 'Unique permission key', isUnique: true },
      { name: 'module', type: 'VARCHAR(64)', nullable: false, description: 'Functional domain (sales, inventory, shifts, iam)' },
      { name: 'description', type: 'VARCHAR(255)', nullable: false, description: 'Human readable explanation of capability' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: ['uq_permissions_key UNIQUE (key)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_permissions_module', definition: 'CREATE INDEX idx_permissions_module ON permissions(module);', purpose: 'Filter permissions during role assignment UI' }
    ],
    relationships: ['1:N with role_permissions'],
    concurrencyControl: 'Static seed table (immutable during normal operations).',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'N/A (Global shared permission registry).'
  },

  // 8. ROLE_PERMISSIONS
  {
    tableName: 'role_permissions',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Junction mapping granular permissions to roles.',
    primaryKey: '(role_id, permission_id)',
    foreignKeys: [
      { column: 'role_id', references: 'roles(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'permission_id', references: 'permissions(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'role_id', type: 'UUID', nullable: false, description: 'Role foreign key', isPk: true, isFk: true },
      { name: 'permission_id', type: 'UUID', nullable: false, description: 'Permission foreign key', isPk: true, isFk: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Assignment timestamp' }
    ],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [
      { name: 'idx_role_permissions_role', definition: 'CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);', purpose: 'Retrieve all permissions assigned to a role' }
    ],
    relationships: ['N:1 with roles', 'N:1 with permissions'],
    concurrencyControl: 'Composite PK prevents duplicates.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'Inherited via parent role tenant_id.'
  },

  // 9. USER_ROLES
  {
    tableName: 'user_roles',
    schemaGroup: 'IAM & Tenancy',
    businessPurpose: 'Junction assigning one or more roles to users within a tenant.',
    primaryKey: '(user_id, role_id)',
    foreignKeys: [
      { column: 'user_id', references: 'users(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'role_id', references: 'roles(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'user_id', type: 'UUID', nullable: false, description: 'User foreign key', isPk: true, isFk: true },
      { name: 'role_id', type: 'UUID', nullable: false, description: 'Role foreign key', isPk: true, isFk: true },
      { name: 'assigned_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Assigned timestamp' }
    ],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [
      { name: 'idx_user_roles_user', definition: 'CREATE INDEX idx_user_roles_user ON user_roles(user_id);', purpose: 'Load user roles on authentication handshake' }
    ],
    relationships: ['N:1 with users', 'N:1 with roles'],
    concurrencyControl: 'Composite PK.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'assigned_at',
    rlsPolicyDefinition: 'Inherited via parent user tenant_id.'
  },

  // 10. CATEGORIES
  {
    tableName: 'categories',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Hierarchical product organization taxonomy supporting arbitrary depth tree structures.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'parent_id', references: 'categories(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Category UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'parent_id', type: 'UUID', nullable: true, description: 'Self-referencing parent category UUID for tree structures', isFk: true },
      { name: 'code', type: 'VARCHAR(64)', nullable: false, description: 'Category code (e.g., BEV, BEV-HOT, BEV-HOT-COFFEE)' },
      { name: 'name', type: 'VARCHAR(150)', nullable: false, description: 'Category display name' },
      { name: 'path', type: 'TEXT', nullable: true, description: 'Materialized path (e.g. /bev/hot/coffee) for fast subtree queries' },
      { name: 'display_order', type: 'INT', nullable: false, defaultVal: '0', description: 'Ordering position on POS quick-pick grid' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active category status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_categories_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_categories_tenant_parent', definition: 'CREATE INDEX idx_categories_tenant_parent ON categories(tenant_id, parent_id) WHERE deleted_at IS NULL;', purpose: 'Query subcategories in POS navigation tree' },
      { name: 'idx_categories_tenant_order', definition: 'CREATE INDEX idx_categories_tenant_order ON categories(tenant_id, display_order) WHERE deleted_at IS NULL;', purpose: 'Sort categories on POS quick-pick grid' }
    ],
    relationships: ['N:1 with tenants', '1:N self-reference with categories', '1:N with products'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 11. BRANDS
  {
    tableName: 'brands',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Product manufacturer or brand registry for catalog filtering and reporting.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Brand UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'code', type: 'VARCHAR(64)', nullable: false, description: 'Brand code' },
      { name: 'name', type: 'VARCHAR(150)', nullable: false, description: 'Brand name (e.g. Nike, Nestle, Sony)' },
      { name: 'website', type: 'VARCHAR(255)', nullable: true, description: 'Manufacturer website URL' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_brands_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_brands_tenant_name', definition: 'CREATE INDEX idx_brands_tenant_name ON brands(tenant_id, name) WHERE deleted_at IS NULL;', purpose: 'Search and filter products by brand' }
    ],
    relationships: ['N:1 with tenants', '1:N with products'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 12. UNITS_OF_MEASURE
  {
    tableName: 'units_of_measure',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Standard units of measurement for sales, stocking, purchasing, and recipe packaging.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'UOM UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'code', type: 'VARCHAR(16)', nullable: false, description: 'UOM symbol (e.g., EA, PCS, KG, G, L, ML, BOX12, CTN24)' },
      { name: 'name', type: 'VARCHAR(64)', nullable: false, description: 'Full unit name (e.g. Each, Kilogram, Carton of 24)' },
      { name: 'type', type: 'uom_type_enum', nullable: false, defaultVal: "'COUNT'", description: 'COUNT, WEIGHT, VOLUME, LENGTH, AREA' },
      { name: 'is_fractional_allowed', type: 'BOOLEAN', nullable: false, defaultVal: 'FALSE', description: 'Allow fractional quantities (e.g. 1.345 kg on scale)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: ['uq_uom_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_uom_tenant_code', definition: 'CREATE UNIQUE INDEX idx_uom_tenant_code ON units_of_measure(tenant_id, code);', purpose: 'Fast UOM code lookup during line item parsing' }
    ],
    relationships: ['1:N with products', '1:N with unit_conversions'],
    concurrencyControl: 'Row update via updated_at trigger.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 13. UNIT_CONVERSIONS
  {
    tableName: 'unit_conversions',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Mathematical conversion multipliers between packaging units (e.g. 1 CTN24 = 24 EA; 1 KG = 1000 G).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'from_uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'to_uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'product_id', references: 'products(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Conversion UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'product_id', type: 'UUID', nullable: true, description: 'Optional specific product constraint (e.g. 1 Box of Item X has 12, but Item Y has 20)', isFk: true },
      { name: 'from_uom_id', type: 'UUID', nullable: false, description: 'Source UOM', isFk: true },
      { name: 'to_uom_id', type: 'UUID', nullable: false, description: 'Target Base UOM', isFk: true },
      { name: 'conversion_factor', type: 'NUMERIC(14, 6)', nullable: false, description: 'Multiplicative multiplier (from * factor = to)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_unit_conv_factor_pos CHECK (conversion_factor > 0)', 'chk_unit_conv_diff CHECK (from_uom_id <> to_uom_id)'],
    indexes: [
      { name: 'idx_unit_conv_lookup', definition: 'CREATE INDEX idx_unit_conv_lookup ON unit_conversions(tenant_id, from_uom_id, to_uom_id, product_id);', purpose: 'Instant UOM conversion resolution in pricing/inventory pipeline' }
    ],
    relationships: ['N:1 with units_of_measure', 'N:1 with products'],
    concurrencyControl: 'Row update via updated_at trigger.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 14. PRODUCTS
  {
    tableName: 'products',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Master product parent representing generic catalog items and grouping matrix variants.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'category_id', references: 'categories(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'brand_id', references: 'brands(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'base_uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Product UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'category_id', type: 'UUID', nullable: true, description: 'Category foreign key', isFk: true },
      { name: 'brand_id', type: 'UUID', nullable: true, description: 'Brand foreign key', isFk: true },
      { name: 'base_uom_id', type: 'UUID', nullable: false, description: 'Base stock-keeping unit of measure', isFk: true },
      { name: 'code', type: 'VARCHAR(64)', nullable: false, description: 'Master product code / style number' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Product commercial name' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Detailed marketing & ingredient description' },
      { name: 'type', type: 'product_type_enum', nullable: false, defaultVal: "'STANDARD'", description: 'STANDARD, MATRIX_PARENT, COMBO_BUNDLE, SERVICE, NON_INVENTORY' },
      { name: 'is_taxable', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Tax applicability flag' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active status' },
      { name: 'has_variants', type: 'BOOLEAN', nullable: false, defaultVal: 'FALSE', description: 'True if item has child variants' },
      { name: 'image_url', type: 'VARCHAR(512)', nullable: true, description: 'S3/CDN hosted product image thumbnail' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_products_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_products_tenant_search', definition: 'CREATE INDEX idx_products_tenant_search ON products USING gin(tenant_id, name gin_trgm_ops) WHERE deleted_at IS NULL;', purpose: 'Ultra-fast trigram text search for POS item lookup' },
      { name: 'idx_products_tenant_category', definition: 'CREATE INDEX idx_products_tenant_category ON products(tenant_id, category_id) WHERE deleted_at IS NULL;', purpose: 'Filter products by category on POS touch screen' },
      { name: 'idx_products_tenant_code', definition: 'CREATE UNIQUE INDEX idx_products_tenant_code ON products(tenant_id, code) WHERE deleted_at IS NULL;', purpose: 'Enforce unique product code per tenant' }
    ],
    relationships: ['N:1 with tenants', 'N:1 with categories', 'N:1 with brands', '1:N with product_variants'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 15. PRODUCT_VARIANTS
  {
    tableName: 'product_variants',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Stock Keeping Units (SKUs) representing concrete purchasable variants with specific attributes (Size, Color, Flavour).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'product_id', references: 'products(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Variant SKU UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'product_id', type: 'UUID', nullable: false, description: 'Master parent product foreign key', isFk: true },
      { name: 'sku', type: 'VARCHAR(64)', nullable: false, description: 'Unique Stock Keeping Unit (e.g., TSHIRT-RED-XL)' },
      { name: 'variant_name', type: 'VARCHAR(255)', nullable: false, description: 'Variant descriptor (e.g., Red / XL)' },
      { name: 'attribute_values', type: 'JSONB', nullable: false, defaultVal: "'{}'::jsonb", description: 'Structured JSON attributes: {"size": "XL", "color": "Red"}' },
      { name: 'cost_price', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Standard wholesale replacement cost' },
      { name: 'retail_price', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Standard retail selling price before customer discounts' },
      { name: 'compare_at_price', type: 'NUMERIC(14, 4)', nullable: true, description: 'Original MSRP / crossed-out strike price' },
      { name: 'min_price', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Floor price: cashier manual discount threshold' },
      { name: 'reorder_point', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '5.0000', description: 'Low stock notification threshold' },
      { name: 'reorder_quantity', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '20.0000', description: 'Suggested reorder batch quantity' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active SKU status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_variants_tenant_sku UNIQUE (tenant_id, sku)'],
    checkConstraints: [
      'chk_variants_cost_nonneg CHECK (cost_price >= 0)',
      'chk_variants_price_nonneg CHECK (retail_price >= 0)',
      'chk_variants_min_price CHECK (min_price >= 0 AND min_price <= retail_price)'
    ],
    indexes: [
      { name: 'idx_variants_tenant_sku', definition: 'CREATE UNIQUE INDEX idx_variants_tenant_sku ON product_variants(tenant_id, upper(sku)) WHERE deleted_at IS NULL;', purpose: 'Instant case-insensitive SKU lookup' },
      { name: 'idx_variants_tenant_product', definition: 'CREATE INDEX idx_variants_tenant_product ON product_variants(tenant_id, product_id) WHERE deleted_at IS NULL;', purpose: 'Load all variants for a product' },
      { name: 'idx_variants_attributes_gin', definition: 'CREATE INDEX idx_variants_attributes_gin ON product_variants USING gin(attribute_values);', purpose: 'Filter variants by JSON attributes (e.g. color=Red)' }
    ],
    relationships: ['N:1 with products', '1:N with barcodes', '1:N with inventory_ledgers', '1:N with sales_order_items'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 16. BARCODES
  {
    tableName: 'barcodes',
    schemaGroup: 'Catalog & UOM',
    businessPurpose: 'Multi-barcode registry mapping EAN-13, UPC-A, Code-128, QR Codes, and supplier codes to specific variants and packaging UOMs.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'variant_id', references: 'product_variants(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Barcode UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'variant_id', type: 'UUID', nullable: false, description: 'Product variant foreign key', isFk: true },
      { name: 'uom_id', type: 'UUID', nullable: false, description: 'Packaging unit associated with this barcode (e.g. Piece vs Case)', isFk: true },
      { name: 'barcode_value', type: 'VARCHAR(64)', nullable: false, description: 'Scanned numerical/alphanumeric barcode string' },
      { name: 'symbology', type: 'barcode_symbology_enum', nullable: false, defaultVal: "'EAN_13'", description: 'EAN_13, EAN_8, UPC_A, UPC_E, CODE_128, CODE_39, QR_CODE, GS1_128' },
      { name: 'is_primary', type: 'BOOLEAN', nullable: false, defaultVal: 'FALSE', description: 'Primary barcode for receipt printing and label generation' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_barcodes_tenant_value UNIQUE (tenant_id, barcode_value)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_barcodes_tenant_scan', definition: 'CREATE UNIQUE INDEX idx_barcodes_tenant_scan ON barcodes(tenant_id, barcode_value) WHERE deleted_at IS NULL;', purpose: 'Sub-millisecond index scan for hardware barcode wedge input' },
      { name: 'idx_barcodes_variant', definition: 'CREATE INDEX idx_barcodes_variant ON barcodes(variant_id) WHERE deleted_at IS NULL;', purpose: 'Retrieve all barcodes for a SKU' }
    ],
    relationships: ['N:1 with product_variants', 'N:1 with units_of_measure'],
    concurrencyControl: 'Unique constraint on (tenant_id, barcode_value).',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  }
];
