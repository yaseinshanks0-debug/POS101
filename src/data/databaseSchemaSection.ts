import { SpecSection, DbTable } from '../types';

export const dbTablesList: DbTable[] = [
  {
    name: 'tenants',
    category: 'Core & Auth',
    purpose: 'Top-level enterprise tenant account for multi-tenant isolation.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Tenant unique identifier' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Organization / Company name' },
      { name: 'slug', type: 'VARCHAR(100)', nullable: false, description: 'URL-safe unique company slug' },
      { name: 'currency_code', type: 'CHAR(3)', nullable: false, defaultVal: "'USD'", description: 'Default ISO currency code' },
      { name: 'settings', type: 'JSONB', nullable: false, defaultVal: "'{}'", description: 'Tenant-wide configuration flags' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'true', description: 'Tenant active status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Audit creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Audit update timestamp' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft delete timestamp' }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL'],
    uniqueConstraints: ['slug'],
    relationships: ['1:N with stores', '1:N with users', '1:N with products'],
    softDelete: 'Timestamp-based (deleted_at)',
    auditFields: 'created_at, updated_at, deleted_at'
  },
  {
    name: 'stores',
    category: 'Core & Auth',
    purpose: 'Physical branch or retail store location belonging to a tenant.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Store unique identifier' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Owner tenant' },
      { name: 'code', type: 'VARCHAR(50)', nullable: false, description: 'Branch short code (e.g., NYC-01)' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Store branch name' },
      { name: 'address', type: 'JSONB', nullable: true, description: 'Physical address object' },
      { name: 'phone', type: 'VARCHAR(50)', nullable: true, description: 'Contact phone number' },
      { name: 'allow_negative_stock', type: 'BOOLEAN', nullable: false, defaultVal: 'false', description: 'Permit sales below 0 stock' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Update timestamp' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft delete' }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_stores_tenant_code ON stores(tenant_id, code) WHERE deleted_at IS NULL'],
    uniqueConstraints: ['(tenant_id, code)'],
    relationships: ['N:1 with tenants', '1:N with registers', '1:N with inventory_snapshots'],
    softDelete: 'deleted_at IS NULL',
    auditFields: 'created_at, updated_at, deleted_at'
  },
  {
    name: 'registers',
    category: 'Core & Auth',
    purpose: 'Physical or mobile POS terminal hardware workstation tied to a store.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Register identifier' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Owner tenant' },
      { name: 'store_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'stores.id', description: 'Associated store' },
      { name: 'code', type: 'VARCHAR(50)', nullable: false, description: 'Terminal ID / Code (e.g. REG-01)' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Terminal label' },
      { name: 'hardware_fingerprint', type: 'VARCHAR(255)', nullable: true, description: 'Device unique hardware ID' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'true', description: 'Active status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Creation timestamp' }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_reg_store_code ON registers(store_id, code)'],
    uniqueConstraints: ['(store_id, code)'],
    relationships: ['N:1 with stores', '1:N with shifts'],
    softDelete: 'None / Status flag',
    auditFields: 'created_at'
  },
  {
    name: 'users',
    category: 'Core & Auth',
    purpose: 'System user accounts (Cashiers, Managers, Administrators).',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'User unique ID' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Tenant ID' },
      { name: 'username', type: 'VARCHAR(100)', nullable: false, description: 'Login username' },
      { name: 'email', type: 'VARCHAR(255)', nullable: true, description: 'User email' },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, description: 'Argon2id password hash' },
      { name: 'pin_hash', type: 'VARCHAR(255)', nullable: true, description: 'Hashed 4-6 digit quick POS login PIN' },
      { name: 'first_name', type: 'VARCHAR(100)', nullable: false, description: 'First name' },
      { name: 'last_name', type: 'VARCHAR(100)', nullable: false, description: 'Last name' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'true', description: 'Active account flag' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft delete' }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_users_tenant_username ON users(tenant_id, username) WHERE deleted_at IS NULL'],
    uniqueConstraints: ['(tenant_id, username)'],
    relationships: ['N:1 with tenants', 'N:M with roles via user_roles'],
    softDelete: 'deleted_at IS NULL',
    auditFields: 'created_at, updated_at, deleted_at'
  },
  {
    name: 'products',
    category: 'Catalog & Pricing',
    purpose: 'Parent product catalog item containing shared brand, category, and metadata.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Product ID' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Tenant ID' },
      { name: 'category_id', type: 'UUID', nullable: true, isFk: true, fkTarget: 'categories.id', description: 'Category' },
      { name: 'brand_id', type: 'UUID', nullable: true, isFk: true, fkTarget: 'brands.id', description: 'Brand' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Product title' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Rich text description' },
      { name: 'base_uom_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'units_of_measure.id', description: 'Base counting unit' },
      { name: 'has_variants', type: 'BOOLEAN', nullable: false, defaultVal: 'false', description: 'Multi-variant flag' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'true', description: 'Active for sale' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft delete' }
    ],
    indexes: ['CREATE INDEX idx_products_tenant_cat ON products(tenant_id, category_id)', 'CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops)'],
    uniqueConstraints: [],
    relationships: ['1:N with product_variants', 'N:1 with categories', 'N:1 with brands'],
    softDelete: 'deleted_at IS NULL',
    auditFields: 'created_at, updated_at, deleted_at'
  },
  {
    name: 'product_variants',
    category: 'Catalog & Pricing',
    purpose: 'Specific SKU variant of a product (e.g. Size/Color combination).',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Variant unique SKU ID' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Tenant ID' },
      { name: 'product_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'products.id', description: 'Parent product ID' },
      { name: 'sku', type: 'VARCHAR(100)', nullable: false, description: 'Stock Keeping Unit unique code' },
      { name: 'variant_name', type: 'VARCHAR(255)', nullable: false, description: 'Variant description (e.g. Blue / XL)' },
      { name: 'attributes', type: 'JSONB', nullable: false, defaultVal: "'{}'", description: 'Key-value attributes (e.g. {color: "blue"})' },
      { name: 'default_cost_price', type: 'NUMERIC(14,4)', nullable: false, defaultVal: '0.0000', description: 'Default unit cost' },
      { name: 'default_retail_price', type: 'NUMERIC(14,4)', nullable: false, defaultVal: '0.0000', description: 'Default retail selling price' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'true', description: 'Active flag' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft delete' }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_variants_tenant_sku ON product_variants(tenant_id, sku) WHERE deleted_at IS NULL'],
    uniqueConstraints: ['(tenant_id, sku)'],
    relationships: ['N:1 with products', '1:N with barcodes', '1:N with inventory_ledgers'],
    softDelete: 'deleted_at IS NULL',
    auditFields: 'created_at, updated_at, deleted_at'
  },
  {
    name: 'barcodes',
    category: 'Catalog & Pricing',
    purpose: 'Multiple barcodes mapping to product variants and packaging units.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Barcode record ID' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Tenant ID' },
      { name: 'variant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'product_variants.id', description: 'Target variant' },
      { name: 'uom_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'units_of_measure.id', description: 'Unit this barcode scans as' },
      { name: 'barcode_value', type: 'VARCHAR(100)', nullable: false, description: 'Raw scanned code (UPC, EAN-13, etc.)' },
      { name: 'barcode_type', type: 'VARCHAR(50)', nullable: false, defaultVal: "'EAN13'", description: 'Symbology type' },
      { name: 'is_primary', type: 'BOOLEAN', nullable: false, defaultVal: 'false', description: 'Primary barcode flag' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Created timestamp' }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_barcodes_tenant_val ON barcodes(tenant_id, barcode_value)'],
    uniqueConstraints: ['(tenant_id, barcode_value)'],
    relationships: ['N:1 with product_variants', 'N:1 with units_of_measure'],
    softDelete: 'Physical delete / Replaced',
    auditFields: 'created_at'
  },
  {
    name: 'inventory_ledgers',
    category: 'Inventory & Purchasing',
    purpose: 'Append-only immutable stock movement journal recording every inventory change.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Movement ledger ID' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Tenant ID' },
      { name: 'store_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'stores.id', description: 'Store location' },
      { name: 'variant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'product_variants.id', description: 'Product variant' },
      { name: 'batch_number', type: 'VARCHAR(100)', nullable: true, description: 'Lot / Batch identifier' },
      { name: 'movement_type', type: 'VARCHAR(50)', nullable: false, description: 'SALE, RETURN, GRN, ADJUST_IN, ADJUST_OUT, TRANSFER' },
      { name: 'quantity_delta', type: 'NUMERIC(14,4)', nullable: false, description: 'Positive or negative stock change in base UOM' },
      { name: 'unit_cost', type: 'NUMERIC(14,4)', nullable: false, defaultVal: '0.0000', description: 'Unit cost at movement time' },
      { name: 'reference_type', type: 'VARCHAR(50)', nullable: false, description: 'SALES_ORDER, PO_RECEIPT, STOCK_COUNT, etc.' },
      { name: 'reference_id', type: 'UUID', nullable: false, description: 'Target entity ID' },
      { name: 'created_by_user_id', type: 'UUID', nullable: true, isFk: true, fkTarget: 'users.id', description: 'Acting user' },
      { name: 'occurred_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Physical event occurrence timestamp' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Server ledger insertion timestamp' }
    ],
    indexes: [
      'CREATE INDEX idx_inv_ledger_store_var ON inventory_ledgers(store_id, variant_id, occurred_at DESC)',
      'CREATE INDEX idx_inv_ledger_ref ON inventory_ledgers(reference_type, reference_id)'
    ],
    uniqueConstraints: [],
    relationships: ['N:1 with stores', 'N:1 with product_variants'],
    softDelete: 'STRICTLY IMMUTABLE - NO DELETES',
    auditFields: 'created_at, occurred_at, created_by_user_id'
  },
  {
    name: 'sales_orders',
    category: 'Sales & POS',
    purpose: 'Header record for completed, refunded, or voided POS commercial transactions.',
    primaryKey: 'id (UUID)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Order ID (UUIDv7 generated by POS)' },
      { name: 'tenant_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'tenants.id', description: 'Tenant ID' },
      { name: 'store_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'stores.id', description: 'Store where sale occurred' },
      { name: 'register_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'registers.id', description: 'Register terminal' },
      { name: 'shift_id', type: 'UUID', nullable: true, isFk: true, fkTarget: 'shifts.id', description: 'Cashier shift session' },
      { name: 'cashier_user_id', type: 'UUID', nullable: false, isFk: true, fkTarget: 'users.id', description: 'Cashier user ID' },
      { name: 'customer_id', type: 'UUID', nullable: true, isFk: true, fkTarget: 'customers.id', description: 'Customer account ID' },
      { name: 'order_number', type: 'VARCHAR(50)', nullable: false, description: 'Human-readable receipt invoice number' },
      { name: 'idempotency_key', type: 'VARCHAR(128)', nullable: false, description: 'Unique hash preventing duplicate sync insertion' },
      { name: 'subtotal_amount', type: 'NUMERIC(14,4)', nullable: false, description: 'Line items subtotal before tax/discounts' },
      { name: 'discount_amount', type: 'NUMERIC(14,4)', nullable: false, defaultVal: '0.0000', description: 'Total discounts applied' },
      { name: 'tax_amount', type: 'NUMERIC(14,4)', nullable: false, defaultVal: '0.0000', description: 'Total tax liability' },
      { name: 'grand_total', type: 'NUMERIC(14,4)', nullable: false, description: 'Final payable order total' },
      { name: 'status', type: 'VARCHAR(30)', nullable: false, defaultVal: "'COMPLETED'", description: 'COMPLETED, RETURNED, VOIDED' },
      { name: 'completed_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Timestamp sale was finalized on POS' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Server sync timestamp' }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_sales_tenant_idempotency ON sales_orders(tenant_id, idempotency_key)',
      'CREATE UNIQUE INDEX idx_sales_store_ordernum ON sales_orders(store_id, order_number)',
      'CREATE INDEX idx_sales_store_date ON sales_orders(store_id, completed_at DESC)'
    ],
    uniqueConstraints: ['(tenant_id, idempotency_key)', '(store_id, order_number)'],
    relationships: ['1:N with sales_order_items', '1:N with sales_order_payments', '1:N with sales_order_taxes'],
    softDelete: 'Financial Voiding with audit record (No hard deletes)',
    auditFields: 'created_at, completed_at, cashier_user_id'
  }
];

export const databaseSchemaSection: SpecSection = {
  id: 'database-schema',
  number: 4,
  title: 'Database Schema Specification (Drizzle ORM & PostgreSQL)',
  shortTitle: '4. Database Schema',
  badge: 'Relational Database',
  summary: 'Production-ready relational database schema engineered in Drizzle ORM and PostgreSQL with 30+ normalized tables, high-performance indexing, row-level multi-tenancy, and immutable audit structures.',
  subsections: [
    {
      id: 'db-schema-overview',
      title: '4.1 Relational Architecture & Multi-Tenancy Strategy',
      content: `The database employs a Shared Database, Shared Schema architecture isolated via PostgreSQL Row-Level Security (RLS) and mandatory \`tenant_id\` column partitioning. All financial numbers utilize \`NUMERIC(14, 4)\` to eliminate binary floating-point rounding errors.

### Schema Domain Grouping:
1. **Core & IAM**: \`tenants\`, \`stores\`, \`registers\`, \`users\`, \`roles\`, \`permissions\`, \`user_roles\`, \`role_permissions\`.
2. **Catalog & Master Data**: \`categories\`, \`brands\`, \`manufacturers\`, \`units_of_measure\`, \`unit_conversions\`, \`products\`, \`product_variants\`, \`barcodes\`.
3. **Pricing & Promotions**: \`price_lists\`, \`price_list_items\`, \`customer_tiers\`, \`quantity_breaks\`, \`promotions\`, \`tax_rates\`, \`tax_rules\`.
4. **Inventory & Procurement**: \`suppliers\`, \`purchase_orders\`, \`purchase_order_items\`, \`goods_received_notes\`, \`grn_items\`, \`stock_transfers\`, \`stock_transfer_items\`, \`inventory_ledgers\`, \`inventory_snapshots\`.
5. **Sales & Checkout**: \`shifts\`, \`cash_movements\`, \`sales_orders\`, \`sales_order_items\`, \`sales_order_payments\`, \`sales_order_taxes\`, \`returns\`, \`return_items\`.
6. **Customers & Loyalty**: \`customers\`, \`customer_credit_ledgers\`, \`loyalty_accounts\`, \`loyalty_transactions\`.
7. **Sync & Audit**: \`sync_outbox\`, \`sync_checkpoints\`, \`audit_logs\`.`,
      codeSnippets: [
        {
          language: 'typescript',
          filename: 'src/db/schema.ts (Drizzle ORM Definition Sample)',
          code: `import { pgTable, uuid, varchar, text, boolean, numeric, timestamp, jsonb, index, uniqueIndex, char } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tenants Table
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  currencyCode: char('currency_code', { length: 3 }).default('USD').notNull(),
  settings: jsonb('settings').default({}).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  slugUnique: uniqueIndex('idx_tenants_slug').on(table.slug),
}));

// Product Variants Table
export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull(),
  variantName: varchar('variant_name', { length: 255 }).notNull(),
  attributes: jsonb('attributes').default({}).notNull(),
  defaultCostPrice: numeric('default_cost_price', { precision: 14, scale: 4 }).default('0.0000').notNull(),
  defaultRetailPrice: numeric('default_retail_price', { precision: 14, scale: 4 }).default('0.0000').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantSkuUnique: uniqueIndex('idx_variants_tenant_sku').on(table.tenantId, table.sku),
}));

// Immutable Stock Movement Ledger
export const inventoryLedgers = pgTable('inventory_ledgers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id),
  batchNumber: varchar('batch_number', { length: 100 }),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // 'SALE', 'RETURN', 'GRN', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER'
  quantityDelta: numeric('quantity_delta', { precision: 14, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).default('0.0000').notNull(),
  referenceType: varchar('reference_type', { length: 50 }).notNull(), // 'SALES_ORDER', 'PO_RECEIPT', 'STOCKTAKE'
  referenceId: uuid('reference_id').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  storeVariantOccurredIdx: index('idx_inv_ledger_store_var').on(table.storeId, table.variantId, table.occurredAt),
  refIdx: index('idx_inv_ledger_ref').on(table.referenceType, table.referenceId),
}));`
        }
      ]
    }
  ]
};
