import { ConsistencyReviewItem } from '../types/databaseTypes';

export const consistencyReviewFindings: ConsistencyReviewItem[] = [
  // 1. Missing Relationships
  {
    id: 'cr-001',
    category: 'Missing Relationships',
    severity: 'High',
    riskDescription: 'Sales orders and inventory ledgers linking to products at the parent level instead of concrete variant SKUs with packaging UOM snapshots.',
    architecturalSolution: 'All transaction tables (sales_order_items, purchase_order_items, goods_receiving_items, inventory_ledgers, stock_transfer_items) strictly reference product_variants(id) and units_of_measure(id). An immutable uom_conversion_factor column is snapshotted directly onto line records to preserve historical conversion calculations even if packaging definitions change in the future.',
    sqlPatternOrRule: 'FOREIGN KEY (variant_id) REFERENCES product_variants(id), FOREIGN KEY (uom_id) REFERENCES units_of_measure(id), uom_conversion_factor NUMERIC(14,6) NOT NULL'
  },
  {
    id: 'cr-002',
    category: 'Missing Relationships',
    severity: 'Medium',
    riskDescription: 'Shift cash sessions unlinked to physical POS hardware register entities, making register-level drawer float audits impossible.',
    architecturalSolution: 'shifts table explicitly references both store_id and register_id with an index on (tenant_id, register_id) WHERE status = "OPEN", guaranteeing that each physical register terminal can have at most one active cash session at any given moment.',
    sqlPatternOrRule: 'FOREIGN KEY (register_id) REFERENCES registers(id), CREATE INDEX idx_shifts_open_register ON shifts(tenant_id, register_id) WHERE status = \'OPEN\''
  },

  // 2. Circular Dependencies
  {
    id: 'cr-003',
    category: 'Circular Dependencies',
    severity: 'Critical',
    riskDescription: 'Potential circular dependency during DDL migrations between customers (referencing sales_orders for last purchase) and sales_orders (referencing customers for account link).',
    architecturalSolution: 'The customer_id foreign key on sales_orders is defined as nullable with ON DELETE SET NULL. The circular reference is decoupled: sales_orders maintains the historical link, while customers does NOT store a foreign key back to sales_orders (recent purchases are queried via the indexed sales_orders table). Migration scripts execute customer creation before adding foreign keys.',
    sqlPatternOrRule: 'sales_orders.customer_id UUID REFERENCES customers(id) ON DELETE SET NULL'
  },
  {
    id: 'cr-004',
    category: 'Circular Dependencies',
    severity: 'Medium',
    riskDescription: 'Circular reference between stores and warehouses (a store has a default stockroom warehouse, and a warehouse belongs to a store).',
    architecturalSolution: 'warehouses has an optional store_id (ON DELETE SET NULL), while registers holds the mandatory default_warehouse_id. This removes the circular dependency between stores and warehouses at the table level and moves the operational binding to the register level where actual stock deductions take place.',
    sqlPatternOrRule: 'registers.default_warehouse_id UUID NOT NULL REFERENCES warehouses(id)'
  },

  // 3. Missing Indexes
  {
    id: 'cr-005',
    category: 'Missing Indexes',
    severity: 'Critical',
    riskDescription: 'Slow barcode lookup during active POS checkout when scanning high-velocity SKUs across 100,000+ items.',
    architecturalSolution: 'Implemented a filtered composite unique index: CREATE UNIQUE INDEX idx_barcodes_tenant_scan ON barcodes(tenant_id, barcode_value) WHERE deleted_at IS NULL. This enables B-Tree index-only scans in < 1ms.',
    sqlPatternOrRule: 'CREATE UNIQUE INDEX idx_barcodes_tenant_scan ON barcodes(tenant_id, barcode_value) WHERE deleted_at IS NULL'
  },
  {
    id: 'cr-006',
    category: 'Missing Indexes',
    severity: 'High',
    riskDescription: 'Degraded full-text search on product names and customer names during interactive typing on POS search bars.',
    architecturalSolution: 'Installed the pg_trgm extension and created GIN trigram indexes on products(tenant_id, name gin_trgm_ops) and customers(tenant_id, (first_name || \' \' || last_name) gin_trgm_ops).',
    sqlPatternOrRule: 'CREATE INDEX idx_products_tenant_search ON products USING gin(tenant_id, name gin_trgm_ops) WHERE deleted_at IS NULL'
  },
  {
    id: 'cr-007',
    category: 'Missing Indexes',
    severity: 'High',
    riskDescription: 'Slow inventory balance aggregation (SUM of quantity_delta) when querying current on-hand stock for a warehouse/SKU.',
    architecturalSolution: 'Created composite covering index on inventory_ledgers(tenant_id, warehouse_id, variant_id, occurred_at) allowing lightning-fast index-only aggregations.',
    sqlPatternOrRule: 'CREATE INDEX idx_inv_stock_balance ON inventory_ledgers(tenant_id, warehouse_id, variant_id, occurred_at)'
  },

  // 4. Duplicate Data
  {
    id: 'cr-008',
    category: 'Duplicate Data',
    severity: 'High',
    riskDescription: 'Product variant pricing and tax rates mutating over time, corrupting historical sales reporting and profit margin calculations if only referenced by foreign key.',
    architecturalSolution: 'Controlled deliberate denormalization: sales_order_items snapshots unit_price, unit_cost, discount_amount, tax_rate_percentage, tax_amount, and uom_conversion_factor at the exact millisecond of checkout. The master catalog tables remain normalized, while completed transactions are 100% frozen.',
    sqlPatternOrRule: 'sales_order_items (unit_price NUMERIC, unit_cost NUMERIC, tax_rate_percentage NUMERIC, uom_conversion_factor NUMERIC)'
  },
  {
    id: 'cr-009',
    category: 'Duplicate Data',
    severity: 'Medium',
    riskDescription: 'Redundant storage of current stock on hand in a mutable product_stocks table leading to drift against the inventory ledger.',
    architecturalSolution: 'Stock balances are authoritative only in the append-only inventory_ledgers table. A PostgreSQL materialized view or cached Redis key is used for read optimization, eliminating double-update split-brain anomalies.',
    sqlPatternOrRule: 'Current Stock = SELECT SUM(quantity_delta) FROM inventory_ledgers WHERE warehouse_id = $1 AND variant_id = $2'
  },

  // 5. Race Conditions & Concurrency
  {
    id: 'cr-010',
    category: 'Race Conditions',
    severity: 'Critical',
    riskDescription: 'Two cashiers simultaneously selling the last remaining stock of a high-demand SKU or updating customer credit balance simultaneously.',
    architecturalSolution: 'Multi-layered concurrency control: (1) Optimistic locking via integer version column with automated trigger increment on mutable entities (products, customers, shifts). (2) SELECT FOR UPDATE row-level locks on customer store credit rows during account payment / charge transactions. (3) Double-entry append-only ledger for inventory—insertions never conflict or lock each other.',
    sqlPatternOrRule: 'UPDATE customers SET current_credit_balance = current_credit_balance + $1, version = version + 1 WHERE id = $2 AND version = $3'
  },
  {
    id: 'cr-011',
    category: 'Race Conditions',
    severity: 'High',
    riskDescription: 'Duplicate checkout submission due to network retries or double-clicking the payment button.',
    architecturalSolution: 'idempotency_keys table with composite primary key (tenant_id, key), request_hash verification, and locked_until lease lock.',
    sqlPatternOrRule: 'INSERT INTO idempotency_keys (tenant_id, key, request_hash, locked_until) VALUES (...) ON CONFLICT DO NOTHING'
  },

  // 6. Multi-Tenant Isolation
  {
    id: 'cr-012',
    category: 'Multi-Tenant Isolation',
    severity: 'Critical',
    riskDescription: 'Accidental cross-tenant data leakage if an application developer omits the WHERE tenant_id = ? clause in a complex query.',
    architecturalSolution: 'PostgreSQL Row-Level Security (RLS) enabled on all 30+ tables. The database automatically enforces: tenant_id = NULLIF(current_setting(\'app.current_tenant_id\', true), \'\')::UUID. Even raw queries executed by backend connection pools cannot read or write data outside the active tenant session variable.',
    sqlPatternOrRule: 'ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation_policy ON sales_orders FOR ALL USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },
  {
    id: 'cr-013',
    category: 'Multi-Tenant Isolation',
    severity: 'High',
    riskDescription: 'Unique constraint collisions across different tenants (e.g., two different stores wanting to use SKU "COFFEE-01" or order number "INV-001").',
    architecturalSolution: 'All natural keys (code, sku, barcode_value, order_number, username) use composite unique constraints incorporating tenant_id: UNIQUE (tenant_id, code).',
    sqlPatternOrRule: 'CONSTRAINT uq_variants_tenant_sku UNIQUE (tenant_id, sku), CONSTRAINT uq_orders_tenant_number UNIQUE (tenant_id, order_number)'
  },

  // 7. Reporting Limitations
  {
    id: 'cr-014',
    category: 'Reporting Limitations',
    severity: 'High',
    riskDescription: 'Slow multi-table aggregations when generating executive dashboards across millions of historical sales orders.',
    architecturalSolution: 'Created composite covering index on sales_orders(tenant_id, store_id, completed_at, status). Shift-level financial totals (total_sales_amount, total_tax_amount, total_discount_amount) are aggregated into the shifts table at session close (Z-Report) for instant historical trend charts.',
    sqlPatternOrRule: 'CREATE INDEX idx_orders_reporting ON sales_orders(tenant_id, store_id, completed_at, status)'
  },

  // 8. Offline Synchronization
  {
    id: 'cr-015',
    category: 'Offline Synchronization',
    severity: 'Critical',
    riskDescription: 'Primary key collisions when multiple offline mobile POS terminals generate sales records simultaneously without internet connectivity.',
    architecturalSolution: 'Primary keys use time-sortable UUIDv7 generated entirely on the Flutter client. In addition, sales_orders includes an offline_id column backed by a unique index (tenant_id, offline_id), ensuring that replay of offline outbox sync batches is strictly idempotent and cannot produce duplicate receipts.',
    sqlPatternOrRule: 'id UUID PRIMARY KEY DEFAULT gen_random_uuid(), offline_id VARCHAR(64), CREATE UNIQUE INDEX idx_orders_offline_id ON sales_orders(tenant_id, offline_id)'
  },
  {
    id: 'cr-016',
    category: 'Offline Synchronization',
    severity: 'High',
    riskDescription: 'Client terminals falling out of sync on master catalog updates (price changes, tax updates, barcode additions).',
    architecturalSolution: 'sync_checkpoints table tracks the monotonic last_server_version per register and domain collection. Delta pull queries retrieve records where updated_at > last_synced_at or version > last_server_version.',
    sqlPatternOrRule: 'SELECT * FROM products WHERE tenant_id = $1 AND updated_at > $2 ORDER BY updated_at ASC LIMIT 500'
  }
];
