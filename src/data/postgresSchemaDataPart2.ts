import { DetailedPostgresTable } from '../types/databaseTypes';

export const detailedPostgresTablesPart2: DetailedPostgresTable[] = [
  // 17. SUPPLIERS
  {
    tableName: 'suppliers',
    schemaGroup: 'Suppliers & Procurement',
    businessPurpose: 'Vendors, manufacturers, and distributors supplying inventory.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Supplier UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'code', type: 'VARCHAR(32)', nullable: false, description: 'Vendor identifier code (e.g. SUP-COCA-COLA)' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false, description: 'Supplier company name' },
      { name: 'contact_person', type: 'VARCHAR(150)', nullable: true, description: 'Sales rep / account manager name' },
      { name: 'email', type: 'VARCHAR(255)', nullable: true, description: 'Vendor order email' },
      { name: 'phone', type: 'VARCHAR(32)', nullable: true, description: 'Vendor telephone' },
      { name: 'payment_terms_days', type: 'INT', nullable: false, defaultVal: '30', description: 'Net payment terms (e.g. Net 30, Net 60)' },
      { name: 'tax_number', type: 'VARCHAR(64)', nullable: true, description: 'Vendor VAT/GST number' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active supplier status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_suppliers_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: ['chk_suppliers_terms_nonneg CHECK (payment_terms_days >= 0)'],
    indexes: [
      { name: 'idx_suppliers_tenant_name', definition: 'CREATE INDEX idx_suppliers_tenant_name ON suppliers(tenant_id, name) WHERE deleted_at IS NULL;', purpose: 'Search suppliers when raising purchase orders' }
    ],
    relationships: ['N:1 with tenants', '1:N with purchase_orders', '1:N with goods_receiving_notes'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 18. PURCHASE_ORDERS
  {
    tableName: 'purchase_orders',
    schemaGroup: 'Suppliers & Procurement',
    businessPurpose: 'Procurement orders issued to suppliers for replenishing warehouse or store stock.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'supplier_id', references: 'suppliers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'destination_warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'created_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'PO UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'supplier_id', type: 'UUID', nullable: false, description: 'Supplier foreign key', isFk: true },
      { name: 'destination_warehouse_id', type: 'UUID', nullable: false, description: 'Target receiving warehouse', isFk: true },
      { name: 'created_by_user_id', type: 'UUID', nullable: false, description: 'Purchaser staff UUID', isFk: true },
      { name: 'po_number', type: 'VARCHAR(64)', nullable: false, description: 'Formatted document number (e.g. PO-2026-0089)' },
      { name: 'status', type: 'po_status_enum', nullable: false, defaultVal: "'DRAFT'", description: 'DRAFT, ISSUED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED' },
      { name: 'issued_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Date sent to vendor' },
      { name: 'expected_delivery_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Anticipated arrival date' },
      { name: 'total_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Total cost of ordered items' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Instructions or delivery terms' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: ['uq_po_tenant_number UNIQUE (tenant_id, po_number)'],
    checkConstraints: ['chk_po_total_nonneg CHECK (total_amount >= 0)'],
    indexes: [
      { name: 'idx_po_tenant_status', definition: 'CREATE INDEX idx_po_tenant_status ON purchase_orders(tenant_id, status);', purpose: 'Filter open/pending purchase orders' },
      { name: 'idx_po_tenant_supplier', definition: 'CREATE INDEX idx_po_tenant_supplier ON purchase_orders(tenant_id, supplier_id);', purpose: 'List PO history per supplier' }
    ],
    relationships: ['N:1 with suppliers', 'N:1 with warehouses', '1:N with purchase_order_items', '1:N with goods_receiving_notes'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 19. PURCHASE_ORDER_ITEMS
  {
    tableName: 'purchase_order_items',
    schemaGroup: 'Suppliers & Procurement',
    businessPurpose: 'Individual line items of a purchase order specifying ordered variant, packaging unit, and agreed cost.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'purchase_order_id', references: 'purchase_orders(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'variant_id', references: 'product_variants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'PO Line item UUID', isPk: true },
      { name: 'purchase_order_id', type: 'UUID', nullable: false, description: 'Parent PO UUID', isFk: true },
      { name: 'variant_id', type: 'UUID', nullable: false, description: 'Product variant SKU', isFk: true },
      { name: 'uom_id', type: 'UUID', nullable: false, description: 'Packaging UOM ordered in (e.g. Case of 24)', isFk: true },
      { name: 'quantity_ordered', type: 'NUMERIC(14, 4)', nullable: false, description: 'Quantity ordered in specified UOM' },
      { name: 'quantity_received', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Cumulative quantity received to date' },
      { name: 'unit_cost', type: 'NUMERIC(14, 4)', nullable: false, description: 'Unit cost price per UOM' },
      { name: 'line_total', type: 'NUMERIC(14, 4)', nullable: false, description: 'Total cost (qty * unit_cost)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: [
      'chk_poi_qty_pos CHECK (quantity_ordered > 0)',
      'chk_poi_qty_rec_nonneg CHECK (quantity_received >= 0)',
      'chk_poi_cost_nonneg CHECK (unit_cost >= 0)'
    ],
    indexes: [
      { name: 'idx_poi_po_id', definition: 'CREATE INDEX idx_poi_po_id ON purchase_order_items(purchase_order_id);', purpose: 'Load line items for PO management' }
    ],
    relationships: ['N:1 with purchase_orders', 'N:1 with product_variants'],
    concurrencyControl: 'Parent PO version increment.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'Inherited via purchase_orders tenant_id.'
  },

  // 20. GOODS_RECEIVING_NOTES (GRN)
  {
    tableName: 'goods_receiving_notes',
    schemaGroup: 'Suppliers & Procurement',
    businessPurpose: 'Physical intake verification and intake receipt when goods arrive at a warehouse/store dock.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'purchase_order_id', references: 'purchase_orders(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'supplier_id', references: 'suppliers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'received_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'GRN UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'purchase_order_id', type: 'UUID', nullable: true, description: 'Associated PO (if intake is PO-based)', isFk: true },
      { name: 'supplier_id', type: 'UUID', nullable: false, description: 'Supplier foreign key', isFk: true },
      { name: 'warehouse_id', type: 'UUID', nullable: false, description: 'Warehouse stock intake destination', isFk: true },
      { name: 'received_by_user_id', type: 'UUID', nullable: false, description: 'Staff who verified physical goods', isFk: true },
      { name: 'grn_number', type: 'VARCHAR(64)', nullable: false, description: 'Document sequence number (e.g. GRN-2026-0045)' },
      { name: 'supplier_invoice_no', type: 'VARCHAR(128)', nullable: true, description: 'Vendor delivery bill / invoice number' },
      { name: 'status', type: 'grn_status_enum', nullable: false, defaultVal: "'POSTED'", description: 'DRAFT, POSTED, CANCELLED' },
      { name: 'received_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Physical intake timestamp' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Receiving notes or damage discrepancies' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: ['uq_grn_tenant_number UNIQUE (tenant_id, grn_number)'],
    checkConstraints: [],
    indexes: [
      { name: 'idx_grn_tenant_warehouse', definition: 'CREATE INDEX idx_grn_tenant_warehouse ON goods_receiving_notes(tenant_id, warehouse_id, received_at);', purpose: 'Audit inventory intake history by facility' }
    ],
    relationships: ['N:1 with purchase_orders', 'N:1 with warehouses', '1:N with goods_receiving_items', '1:N with inventory_ledgers'],
    concurrencyControl: 'Immutable financial/stock record once status is POSTED.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at, received_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 21. GOODS_RECEIVING_ITEMS
  {
    tableName: 'goods_receiving_items',
    schemaGroup: 'Suppliers & Procurement',
    businessPurpose: 'Detailed line items of physically received inventory including batch numbers and expiry dates.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'grn_id', references: 'goods_receiving_notes(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'variant_id', references: 'product_variants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'GRN Line item UUID', isPk: true },
      { name: 'grn_id', type: 'UUID', nullable: false, description: 'GRN parent UUID', isFk: true },
      { name: 'variant_id', type: 'UUID', nullable: false, description: 'Product variant SKU', isFk: true },
      { name: 'uom_id', type: 'UUID', nullable: false, description: 'Received UOM', isFk: true },
      { name: 'quantity_received', type: 'NUMERIC(14, 4)', nullable: false, description: 'Quantity physically accepted' },
      { name: 'quantity_rejected', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Quantity rejected due to damage/expiry' },
      { name: 'unit_cost', type: 'NUMERIC(14, 4)', nullable: false, description: 'Actual landed unit cost' },
      { name: 'batch_lot_number', type: 'VARCHAR(64)', nullable: true, description: 'Manufacturer batch/lot code' },
      { name: 'expiry_date', type: 'DATE', nullable: true, description: 'Expiration date (for perishables / pharmaceuticals)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_gri_qty_pos CHECK (quantity_received > 0)', 'chk_gri_cost_nonneg CHECK (unit_cost >= 0)'],
    indexes: [
      { name: 'idx_gri_grn_id', definition: 'CREATE INDEX idx_gri_grn_id ON goods_receiving_items(grn_id);', purpose: 'Load GRN details' },
      { name: 'idx_gri_batch', definition: 'CREATE INDEX idx_gri_batch ON goods_receiving_items(batch_lot_number) WHERE batch_lot_number IS NOT NULL;', purpose: 'Trace batch lot recalls' }
    ],
    relationships: ['N:1 with goods_receiving_notes', 'N:1 with product_variants'],
    concurrencyControl: 'Immutable record linked to POSTED GRN.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'Inherited via goods_receiving_notes tenant_id.'
  },

  // 22. INVENTORY_LEDGERS (Double-entry append-only stock movement journal)
  {
    tableName: 'inventory_ledgers',
    schemaGroup: 'Inventory & Warehousing',
    businessPurpose: 'Append-only immutable stock ledger recording all inventory changes (Sales, Intakes, Adjustments, Transfers, Returns). Current on-hand stock is the SUM(quantity_delta).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'variant_id', references: 'product_variants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'created_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Ledger entry UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'warehouse_id', type: 'UUID', nullable: false, description: 'Warehouse / stock location', isFk: true },
      { name: 'variant_id', type: 'UUID', nullable: false, description: 'Product variant SKU', isFk: true },
      { name: 'created_by_user_id', type: 'UUID', nullable: false, description: 'User or system process who authored the movement', isFk: true },
      { name: 'movement_type', type: 'inventory_movement_type_enum', nullable: false, description: 'SALE, SALE_RETURN, PURCHASE_RECEIPT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_INCREASE, ADJUSTMENT_DECREASE, STOCK_TAKE_VARIANCE, DAMAGE_WASTE' },
      { name: 'quantity_delta', type: 'NUMERIC(14, 4)', nullable: false, description: 'Signed change in base UOM (Positive = IN, Negative = OUT)' },
      { name: 'unit_cost', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Cost valuation at time of movement (FIFO/WAC)' },
      { name: 'reference_document_type', type: 'VARCHAR(64)', nullable: false, description: 'SALES_ORDER, GRN, STOCK_TRANSFER, AUDIT_ADJUSTMENT' },
      { name: 'reference_document_id', type: 'UUID', nullable: false, description: 'UUID of the originating transaction' },
      { name: 'batch_lot_number', type: 'VARCHAR(64)', nullable: true, description: 'Batch/Lot identifier' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Reason for manual adjustment or audit notes' },
      { name: 'occurred_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Business transaction timestamp' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Database write timestamp' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_inv_delta_nonzero CHECK (quantity_delta <> 0)'],
    indexes: [
      { name: 'idx_inv_stock_balance', definition: 'CREATE INDEX idx_inv_stock_balance ON inventory_ledgers(tenant_id, warehouse_id, variant_id, occurred_at);', purpose: 'High-speed aggregation of current on-hand stock and historical valuation' },
      { name: 'idx_inv_ref_doc', definition: 'CREATE INDEX idx_inv_ref_doc ON inventory_ledgers(reference_document_type, reference_document_id);', purpose: 'Trace all ledger entries for a sales order or GRN' }
    ],
    relationships: ['N:1 with warehouses', 'N:1 with product_variants', 'Polymorphic reference with sales_orders, goods_receiving_notes, stock_transfers'],
    concurrencyControl: 'Strictly append-only journal. Zero updates or deletes permitted.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'occurred_at, created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 23. STOCK_TRANSFERS
  {
    tableName: 'stock_transfers',
    schemaGroup: 'Inventory & Warehousing',
    businessPurpose: 'Inter-branch or warehouse-to-store inventory relocation workflows with dispatch and receipt sign-offs.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'source_warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'destination_warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'requested_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'dispatched_by_user_id', references: 'users(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      { column: 'received_by_user_id', references: 'users(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Transfer UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'source_warehouse_id', type: 'UUID', nullable: false, description: 'Origin location', isFk: true },
      { name: 'destination_warehouse_id', type: 'UUID', nullable: false, description: 'Destination location', isFk: true },
      { name: 'requested_by_user_id', type: 'UUID', nullable: false, description: 'Staff requesting transfer', isFk: true },
      { name: 'dispatched_by_user_id', type: 'UUID', nullable: true, description: 'Staff confirming departure', isFk: true },
      { name: 'received_by_user_id', type: 'UUID', nullable: true, description: 'Staff confirming receipt', isFk: true },
      { name: 'transfer_number', type: 'VARCHAR(64)', nullable: false, description: 'Transfer sequence code (e.g. TR-2026-0032)' },
      { name: 'status', type: 'transfer_status_enum', nullable: false, defaultVal: "'REQUESTED'", description: 'REQUESTED, APPROVED, IN_TRANSIT, RECEIVED, CANCELLED' },
      { name: 'dispatched_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Dispatch timestamp' },
      { name: 'received_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Receipt timestamp' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Transit notes / carrier tracking' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: ['uq_transfers_tenant_number UNIQUE (tenant_id, transfer_number)'],
    checkConstraints: ['chk_transfer_diff_warehouses CHECK (source_warehouse_id <> destination_warehouse_id)'],
    indexes: [
      { name: 'idx_transfers_tenant_status', definition: 'CREATE INDEX idx_transfers_tenant_status ON stock_transfers(tenant_id, status);', purpose: 'Filter active in-transit transfers' }
    ],
    relationships: ['N:1 with warehouses (source & dest)', '1:N with stock_transfer_items'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 24. STOCK_TRANSFER_ITEMS
  {
    tableName: 'stock_transfer_items',
    schemaGroup: 'Inventory & Warehousing',
    businessPurpose: 'Itemized variants and quantities in a transfer batch.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'transfer_id', references: 'stock_transfers(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'variant_id', references: 'product_variants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Line UUID', isPk: true },
      { name: 'transfer_id', type: 'UUID', nullable: false, description: 'Parent transfer UUID', isFk: true },
      { name: 'variant_id', type: 'UUID', nullable: false, description: 'Product variant SKU', isFk: true },
      { name: 'uom_id', type: 'UUID', nullable: false, description: 'Transfer UOM', isFk: true },
      { name: 'quantity_dispatched', type: 'NUMERIC(14, 4)', nullable: false, description: 'Quantity sent out from source' },
      { name: 'quantity_received', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Quantity verified at destination' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_sti_qty_disp_pos CHECK (quantity_dispatched > 0)', 'chk_sti_qty_rec_nonneg CHECK (quantity_received >= 0)'],
    indexes: [
      { name: 'idx_sti_transfer_id', definition: 'CREATE INDEX idx_sti_transfer_id ON stock_transfer_items(transfer_id);', purpose: 'Load transfer line items' }
    ],
    relationships: ['N:1 with stock_transfers', 'N:1 with product_variants'],
    concurrencyControl: 'Parent transfer version increment.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'Inherited via stock_transfers tenant_id.'
  }
];
