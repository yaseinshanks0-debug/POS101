import { DetailedPostgresTable } from '../types/databaseTypes';

export const detailedPostgresTablesPart3: DetailedPostgresTable[] = [
  // 25. SHIFTS (POS Register Cash Sessions)
  {
    tableName: 'shifts',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Cashier work shift and drawer reconciliation session tracking opening float, expected cash, actual counted cash, and variance.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'store_id', references: 'stores(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'register_id', references: 'registers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'opened_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'closed_by_user_id', references: 'users(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Shift UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'store_id', type: 'UUID', nullable: false, description: 'Store location', isFk: true },
      { name: 'register_id', type: 'UUID', nullable: false, description: 'POS Register hardware instance', isFk: true },
      { name: 'opened_by_user_id', type: 'UUID', nullable: false, description: 'Cashier opening drawer', isFk: true },
      { name: 'closed_by_user_id', type: 'UUID', nullable: true, description: 'Cashier/Supervisor closing shift', isFk: true },
      { name: 'shift_number', type: 'VARCHAR(64)', nullable: false, description: 'Sequential shift code (e.g. SHIFT-REG1-20260826-01)' },
      { name: 'status', type: 'shift_status_enum', nullable: false, defaultVal: "'OPEN'", description: 'OPEN, CLOSED, SUSPENDED' },
      { name: 'opened_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Shift start timestamp' },
      { name: 'closed_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Shift close timestamp' },
      { name: 'opening_float', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Initial cash drawer float' },
      { name: 'expected_cash', type: 'NUMERIC(14, 4)', nullable: true, description: 'System-calculated expected cash (Float + Sales - Returns + Drops)' },
      { name: 'actual_counted_cash', type: 'NUMERIC(14, 4)', nullable: true, description: 'Blind cash count entered by cashier at close' },
      { name: 'cash_variance', type: 'NUMERIC(14, 4)', nullable: true, description: 'Discrepancy (Counted - Expected; Over/Short)' },
      { name: 'total_sales_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Total revenue during shift' },
      { name: 'total_tax_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Total tax collected' },
      { name: 'total_discount_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Total discounts granted' },
      { name: 'order_count', type: 'INT', nullable: false, defaultVal: '0', description: 'Number of completed transactions' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Z-Report audit notes' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: ['uq_shifts_tenant_number UNIQUE (tenant_id, shift_number)'],
    checkConstraints: ['chk_shifts_float_nonneg CHECK (opening_float >= 0)'],
    indexes: [
      { name: 'idx_shifts_open_register', definition: 'CREATE INDEX idx_shifts_open_register ON shifts(tenant_id, register_id) WHERE status = \'OPEN\';', purpose: 'Verify if terminal has active open shift' },
      { name: 'idx_shifts_store_date', definition: 'CREATE INDEX idx_shifts_store_date ON shifts(tenant_id, store_id, opened_at);', purpose: 'Daily shift summaries and financial reconciliations' }
    ],
    relationships: ['N:1 with registers', '1:N with sales_orders', '1:N with cash_movements'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 26. CASH_MOVEMENTS
  {
    tableName: 'cash_movements',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Auditable cash drawer inflows and outflows outside of direct sales (Float In, Safe Drop, Petty Cash Expense, Cash In/Out).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'shift_id', references: 'shifts(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Movement UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'shift_id', type: 'UUID', nullable: false, description: 'Active shift session foreign key', isFk: true },
      { name: 'user_id', type: 'UUID', nullable: false, description: 'Authorizing cashier/supervisor', isFk: true },
      { name: 'type', type: 'cash_movement_type_enum', nullable: false, description: 'OPENING_FLOAT, PAY_IN, PAY_OUT, SAFE_DROP, CLOSING_COUNT' },
      { name: 'amount', type: 'NUMERIC(14, 4)', nullable: false, description: 'Monetary cash value' },
      { name: 'reason', type: 'VARCHAR(255)', nullable: false, description: 'Reason for payout (e.g. Cleaning supplies, Courier payment)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_cash_amount_pos CHECK (amount > 0)'],
    indexes: [
      { name: 'idx_cash_movements_shift', definition: 'CREATE INDEX idx_cash_movements_shift ON cash_movements(shift_id);', purpose: 'Calculate cash balance during Z-Report closing' }
    ],
    relationships: ['N:1 with shifts', 'N:1 with users'],
    concurrencyControl: 'Append-only immutable record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 27. TAXES & PRODUCT_TAXES
  {
    tableName: 'taxes',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Jurisdictional sales tax and VAT rate definitions (e.g. State Tax 6%, Standard VAT 20%, Zero-Rated).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Tax rate UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'code', type: 'VARCHAR(32)', nullable: false, description: 'Tax code (e.g. VAT-20, GST-10, ZERO)' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Display name on receipt (e.g. Standard VAT 20%)' },
      { name: 'rate_percentage', type: 'NUMERIC(7, 4)', nullable: false, description: 'Percentage rate (e.g. 20.0000 for 20%)' },
      { name: 'is_inclusive', type: 'BOOLEAN', nullable: false, defaultVal: 'FALSE', description: 'True if product prices already include tax' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: ['uq_taxes_tenant_code UNIQUE (tenant_id, code)'],
    checkConstraints: ['chk_tax_rate_nonneg CHECK (rate_percentage >= 0)'],
    indexes: [
      { name: 'idx_taxes_tenant_code', definition: 'CREATE INDEX idx_taxes_tenant_code ON taxes(tenant_id, code);', purpose: 'Tax resolution in cart pricing pipeline' }
    ],
    relationships: ['1:N with product_taxes', '1:N with sales_order_items'],
    concurrencyControl: 'Row update via updated_at trigger.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 28. DISCOUNTS & PROMOTIONS
  {
    tableName: 'promotions',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Marketing campaigns, buy-X-get-Y deals, category percentage off, and coupon promo codes.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Promotion UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'code', type: 'VARCHAR(64)', nullable: true, description: 'Optional coupon code entered at POS (e.g. SUMMER20)' },
      { name: 'name', type: 'VARCHAR(150)', nullable: false, description: 'Promotion title' },
      { name: 'type', type: 'promotion_type_enum', nullable: false, description: 'PERCENTAGE, FIXED_AMOUNT, BOGO_FREE, BUNDLE_PRICE' },
      { name: 'value', type: 'NUMERIC(14, 4)', nullable: false, description: 'Discount value (e.g. 15.00 for 15% or $10 off)' },
      { name: 'min_order_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Minimum cart spend threshold' },
      { name: 'start_date', type: 'TIMESTAMPTZ', nullable: false, description: 'Campaign activation date' },
      { name: 'end_date', type: 'TIMESTAMPTZ', nullable: false, description: 'Campaign expiration date' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active toggle' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_promo_val_nonneg CHECK (value >= 0)', 'chk_promo_dates CHECK (end_date > start_date)'],
    indexes: [
      { name: 'idx_promo_active_date', definition: 'CREATE INDEX idx_promo_active_date ON promotions(tenant_id, is_active, start_date, end_date);', purpose: 'Identify matching promotions during cart evaluation' }
    ],
    relationships: ['1:N with sales_orders'],
    concurrencyControl: 'Row update via updated_at trigger.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, updated_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 29. CUSTOMERS
  {
    tableName: 'customers',
    schemaGroup: 'Customers & Loyalty',
    businessPurpose: 'Customer registry with contact details, outstanding credit balance, credit limits, and loyalty tier.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Customer UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'customer_code', type: 'VARCHAR(64)', nullable: false, description: 'Customer ID / Membership card number' },
      { name: 'first_name', type: 'VARCHAR(100)', nullable: false, description: 'Given name' },
      { name: 'last_name', type: 'VARCHAR(100)', nullable: false, description: 'Family name' },
      { name: 'email', type: 'VARCHAR(255)', nullable: true, description: 'Customer email' },
      { name: 'phone', type: 'VARCHAR(32)', nullable: true, description: 'Customer telephone' },
      { name: 'tier', type: 'customer_tier_enum', nullable: false, defaultVal: "'STANDARD'", description: 'STANDARD, SILVER, GOLD, PLATINUM, VIP' },
      { name: 'credit_limit', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Maximum allowed store account credit' },
      { name: 'current_credit_balance', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Current outstanding store credit owed' },
      { name: 'loyalty_points_balance', type: 'INT', nullable: false, defaultVal: '0', description: 'Active accumulated loyalty points' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'TRUE', description: 'Active account status' },
      { name: 'version', type: 'INT', nullable: false, defaultVal: '1', description: 'Optimistic locking version counter' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Updated at' },
      { name: 'deleted_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Soft deletion' }
    ],
    uniqueConstraints: ['uq_customers_tenant_code UNIQUE (tenant_id, customer_code)'],
    checkConstraints: ['chk_cust_credit_limit CHECK (credit_limit >= 0)', 'chk_cust_points_nonneg CHECK (loyalty_points_balance >= 0)'],
    indexes: [
      { name: 'idx_customers_tenant_search', definition: 'CREATE INDEX idx_customers_tenant_search ON customers USING gin(tenant_id, (first_name || \' \' || last_name) gin_trgm_ops) WHERE deleted_at IS NULL;', purpose: 'Trigram search by customer full name on POS' },
      { name: 'idx_customers_tenant_phone', definition: 'CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone) WHERE deleted_at IS NULL;', purpose: 'Quick customer identification by phone number' }
    ],
    relationships: ['N:1 with tenants', '1:N with sales_orders', '1:N with customer_credit_ledgers', '1:N with loyalty_ledgers'],
    concurrencyControl: 'Optimistic locking via version column.',
    softDeleteStrategy: 'Soft Delete (deleted_at IS NULL)',
    auditColumns: 'created_at, updated_at, deleted_at, version',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 30. CUSTOMER_CREDIT_LEDGERS
  {
    tableName: 'customer_credit_ledgers',
    schemaGroup: 'Customers & Loyalty',
    businessPurpose: 'Append-only ledger recording all changes to customer account store credit balances (Credit sales, Payments on account, Adjustments).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'customer_id', references: 'customers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'created_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Credit ledger UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'customer_id', type: 'UUID', nullable: false, description: 'Customer foreign key', isFk: true },
      { name: 'created_by_user_id', type: 'UUID', nullable: false, description: 'Staff authoring transaction', isFk: true },
      { name: 'type', type: 'credit_ledger_type_enum', nullable: false, description: 'CHARGE_SALE, ACCOUNT_PAYMENT, REFUND_CREDIT, MANUAL_ADJUSTMENT' },
      { name: 'amount_delta', type: 'NUMERIC(14, 4)', nullable: false, description: 'Signed change (Positive = balance increased/debt added, Negative = paid off)' },
      { name: 'balance_after', type: 'NUMERIC(14, 4)', nullable: false, description: 'Snapshot balance after transaction' },
      { name: 'reference_document_type', type: 'VARCHAR(64)', nullable: false, description: 'SALES_ORDER, PAYMENT_RECEIPT, ADJUSTMENT' },
      { name: 'reference_document_id', type: 'UUID', nullable: false, description: 'Foreign transaction UUID' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Audit notes' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_ccl_amount_nonzero CHECK (amount_delta <> 0)'],
    indexes: [
      { name: 'idx_ccl_customer_created', definition: 'CREATE INDEX idx_ccl_customer_created ON customer_credit_ledgers(tenant_id, customer_id, created_at);', purpose: 'Generate customer account statements and balance audits' }
    ],
    relationships: ['N:1 with customers'],
    concurrencyControl: 'Append-only immutable record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 31. LOYALTY_LEDGERS
  {
    tableName: 'loyalty_ledgers',
    schemaGroup: 'Customers & Loyalty',
    businessPurpose: 'Append-only points ledger tracking points earned from sales, redeemed for discounts, or expired.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'customer_id', references: 'customers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Loyalty entry UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'customer_id', type: 'UUID', nullable: false, description: 'Customer foreign key', isFk: true },
      { name: 'points_delta', type: 'INT', nullable: false, description: 'Signed point change (Positive = earned, Negative = redeemed/expired)' },
      { name: 'points_balance_after', type: 'INT', nullable: false, description: 'Points balance snapshot' },
      { name: 'reason', type: 'VARCHAR(128)', nullable: false, description: 'SALE_EARN, REDEEM_DISCOUNT, PROMO_BONUS, EXPIRY' },
      { name: 'sales_order_id', type: 'UUID', nullable: true, description: 'Associated order UUID', isFk: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_loyalty_delta_nonzero CHECK (points_delta <> 0)'],
    indexes: [
      { name: 'idx_loyalty_customer_date', definition: 'CREATE INDEX idx_loyalty_customer_date ON loyalty_ledgers(tenant_id, customer_id, created_at);', purpose: 'Customer points balance verification and statement history' }
    ],
    relationships: ['N:1 with customers', 'N:1 with sales_orders'],
    concurrencyControl: 'Append-only immutable record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 32. SALES_ORDERS (Header)
  {
    tableName: 'sales_orders',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Master sales order and fiscal receipt header recording totals, customer link, cashier, and register metadata.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'store_id', references: 'stores(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'register_id', references: 'registers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'shift_id', references: 'shifts(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'cashier_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'customer_id', references: 'customers(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Order UUID (client generated UUIDv7 offline)', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'store_id', type: 'UUID', nullable: false, description: 'Store location', isFk: true },
      { name: 'register_id', type: 'UUID', nullable: false, description: 'POS Register instance', isFk: true },
      { name: 'shift_id', type: 'UUID', nullable: false, description: 'Shift session foreign key', isFk: true },
      { name: 'cashier_user_id', type: 'UUID', nullable: false, description: 'Cashier who transacted the sale', isFk: true },
      { name: 'customer_id', type: 'UUID', nullable: true, description: 'Customer profile (null for anonymous walk-in)', isFk: true },
      { name: 'order_number', type: 'VARCHAR(64)', nullable: false, description: 'Human-readable receipt sequence (e.g. INV-NYC1-REG1-00234)' },
      { name: 'offline_id', type: 'VARCHAR(64)', nullable: true, description: 'Client-side UUIDv7 outbox transaction key', isUnique: true },
      { name: 'status', type: 'sales_order_status_enum', nullable: false, defaultVal: "'COMPLETED'", description: 'COMPLETED, PARKED, VOIDED, REFUNDED, PARTIALLY_REFUNDED' },
      { name: 'subtotal_amount', type: 'NUMERIC(14, 4)', nullable: false, description: 'Net lines total before order discount and tax' },
      { name: 'discount_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Total discounts applied to order' },
      { name: 'tax_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Total calculated tax' },
      { name: 'total_amount', type: 'NUMERIC(14, 4)', nullable: false, description: 'Final payable gross total' },
      { name: 'paid_amount', type: 'NUMERIC(14, 4)', nullable: false, description: 'Total payments tendered' },
      { name: 'change_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Cash change returned to customer' },
      { name: 'loyalty_points_earned', type: 'INT', nullable: false, defaultVal: '0', description: 'Points awarded on this sale' },
      { name: 'completed_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Checkout completion timestamp' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Database sync insert timestamp' }
    ],
    uniqueConstraints: ['uq_orders_tenant_number UNIQUE (tenant_id, order_number)'],
    checkConstraints: [
      'chk_order_subtotal_nonneg CHECK (subtotal_amount >= 0)',
      'chk_order_total_nonneg CHECK (total_amount >= 0)',
      'chk_order_paid_sufficient CHECK (paid_amount >= (total_amount - 0.0001))'
    ],
    indexes: [
      { name: 'idx_orders_reporting', definition: 'CREATE INDEX idx_orders_reporting ON sales_orders(tenant_id, store_id, completed_at, status);', purpose: 'Critical composite index for sales reports, dashboards, and daily analytics' },
      { name: 'idx_orders_customer', definition: 'CREATE INDEX idx_orders_customer ON sales_orders(tenant_id, customer_id, completed_at) WHERE customer_id IS NOT NULL;', purpose: 'Customer purchase history view' },
      { name: 'idx_orders_offline_id', definition: 'CREATE UNIQUE INDEX idx_orders_offline_id ON sales_orders(tenant_id, offline_id) WHERE offline_id IS NOT NULL;', purpose: 'Idempotency gate for offline sync push' }
    ],
    relationships: ['1:N with sales_order_items', '1:N with sales_order_payments', '1:N with sales_order_returns', '1:N with inventory_ledgers'],
    concurrencyControl: 'Immutable financial record once completed.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'completed_at, created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 33. SALES_ORDER_ITEMS (Lines)
  {
    tableName: 'sales_order_items',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Individual line items of a sale capturing price, quantity, UOM conversion snapshot, discounts, and applied tax rates.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'sales_order_id', references: 'sales_orders(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'variant_id', references: 'product_variants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'uom_id', references: 'units_of_measure(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Item line UUID', isPk: true },
      { name: 'sales_order_id', type: 'UUID', nullable: false, description: 'Sales order parent foreign key', isFk: true },
      { name: 'variant_id', type: 'UUID', nullable: false, description: 'Product variant SKU sold', isFk: true },
      { name: 'uom_id', type: 'UUID', nullable: false, description: 'UOM unit purchased in', isFk: true },
      { name: 'uom_conversion_factor', type: 'NUMERIC(14, 6)', nullable: false, defaultVal: '1.000000', description: 'Multiplier to base stock UOM snapshot' },
      { name: 'quantity', type: 'NUMERIC(14, 4)', nullable: false, description: 'Quantity sold' },
      { name: 'unit_price', type: 'NUMERIC(14, 4)', nullable: false, description: 'Original retail unit price snapshot' },
      { name: 'unit_cost', type: 'NUMERIC(14, 4)', nullable: false, description: 'Product unit cost snapshot for COGS profitability reporting' },
      { name: 'discount_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Line discount amount' },
      { name: 'tax_rate_percentage', type: 'NUMERIC(7, 4)', nullable: false, defaultVal: '0.0000', description: 'Tax rate applied snapshot' },
      { name: 'tax_amount', type: 'NUMERIC(14, 4)', nullable: false, defaultVal: '0.0000', description: 'Tax calculated for line' },
      { name: 'line_total', type: 'NUMERIC(14, 4)', nullable: false, description: 'Net line total ((qty * unit_price) - discount + tax)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_soi_qty_pos CHECK (quantity > 0)', 'chk_soi_price_nonneg CHECK (unit_price >= 0)'],
    indexes: [
      { name: 'idx_soi_order_id', definition: 'CREATE INDEX idx_soi_order_id ON sales_order_items(sales_order_id);', purpose: 'Load order line items' },
      { name: 'idx_soi_variant_reporting', definition: 'CREATE INDEX idx_soi_variant_reporting ON sales_order_items(variant_id, created_at);', purpose: 'Best-seller and SKU margin analytics' }
    ],
    relationships: ['N:1 with sales_orders', 'N:1 with product_variants'],
    concurrencyControl: 'Immutable record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'Inherited via sales_orders tenant_id.'
  },

  // 34. SALES_ORDER_PAYMENTS (Multi-tender split payments)
  {
    tableName: 'sales_order_payments',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Tender records supporting split payments across Cash, Credit Card, Debit Card, Gift Card, Store Credit, and Loyalty Points.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'sales_order_id', references: 'sales_orders(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Payment UUID', isPk: true },
      { name: 'sales_order_id', type: 'UUID', nullable: false, description: 'Sales order foreign key', isFk: true },
      { name: 'method', type: 'payment_method_enum', nullable: false, description: 'CASH, CREDIT_CARD, DEBIT_CARD, GIFT_CARD, CUSTOMER_CREDIT, LOYALTY_POINTS, MOBILE_PAYMENT' },
      { name: 'amount', type: 'NUMERIC(14, 4)', nullable: false, description: 'Amount paid via this tender' },
      { name: 'currency_code', type: 'CHAR(3)', nullable: false, defaultVal: "'USD'", description: 'ISO 4217 currency' },
      { name: 'card_last_four', type: 'CHAR(4)', nullable: true, description: 'Last 4 digits for receipt identification' },
      { name: 'card_brand', type: 'VARCHAR(32)', nullable: true, description: 'Visa, MasterCard, Amex' },
      { name: 'gateway_transaction_id', type: 'VARCHAR(128)', nullable: true, description: 'Payment processor reference' },
      { name: 'status', type: 'payment_status_enum', nullable: false, defaultVal: "'CAPTURED'", description: 'CAPTURED, REFUNDED, VOIDED' },
      { name: 'paid_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Payment timestamp' }
    ],
    uniqueConstraints: [],
    checkConstraints: ['chk_sop_amount_pos CHECK (amount > 0)'],
    indexes: [
      { name: 'idx_sop_order_id', definition: 'CREATE INDEX idx_sop_order_id ON sales_order_payments(sales_order_id);', purpose: 'Load payments for receipt' },
      { name: 'idx_sop_method_reporting', definition: 'CREATE INDEX idx_sop_method_reporting ON sales_order_payments(method, paid_at);', purpose: 'Payment breakdown reports' }
    ],
    relationships: ['N:1 with sales_orders'],
    concurrencyControl: 'Immutable financial record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'paid_at',
    rlsPolicyDefinition: 'Inherited via sales_orders tenant_id.'
  },

  // 35. SALES_ORDER_RETURNS (Item returns and refunds)
  {
    tableName: 'sales_order_returns',
    schemaGroup: 'Sales & POS Registers',
    businessPurpose: 'Item returns and refunds against original sales receipts with condition inspection (Restockable vs Damaged).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'original_sales_order_id', references: 'sales_orders(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'original_sales_order_item_id', references: 'sales_order_items(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'processed_by_user_id', references: 'users(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'destination_warehouse_id', references: 'warehouses(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Return UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'original_sales_order_id', type: 'UUID', nullable: false, description: 'Original invoice UUID', isFk: true },
      { name: 'original_sales_order_item_id', type: 'UUID', nullable: false, description: 'Original line item UUID', isFk: true },
      { name: 'processed_by_user_id', type: 'UUID', nullable: false, description: 'Staff processing refund', isFk: true },
      { name: 'destination_warehouse_id', type: 'UUID', nullable: false, description: 'Location where item is returned', isFk: true },
      { name: 'return_number', type: 'VARCHAR(64)', nullable: false, description: 'Return receipt sequence (e.g. RET-NYC1-00045)' },
      { name: 'quantity_returned', type: 'NUMERIC(14, 4)', nullable: false, description: 'Quantity refunded' },
      { name: 'refund_amount', type: 'NUMERIC(14, 4)', nullable: false, description: 'Total refund payout' },
      { name: 'reason', type: 'return_reason_enum', nullable: false, description: 'DEFECTIVE, WRONG_ITEM, CUSTOMER_CHANGE_OF_MIND, EXPIRED' },
      { name: 'item_condition', type: 'return_condition_enum', nullable: false, defaultVal: "'RESTOCKABLE'", description: 'RESTOCKABLE, DAMAGED_SCRAP' },
      { name: 'refund_method', type: 'payment_method_enum', nullable: false, description: 'CASH, ORIGINAL_CARD, STORE_CREDIT' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Inspection notes' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' }
    ],
    uniqueConstraints: ['uq_returns_tenant_number UNIQUE (tenant_id, return_number)'],
    checkConstraints: ['chk_returns_qty_pos CHECK (quantity_returned > 0)', 'chk_returns_refund_pos CHECK (refund_amount >= 0)'],
    indexes: [
      { name: 'idx_returns_orig_order', definition: 'CREATE INDEX idx_returns_orig_order ON sales_order_returns(original_sales_order_id);', purpose: 'Track total refunded quantity per sales receipt' }
    ],
    relationships: ['N:1 with sales_orders', 'N:1 with sales_order_items', '1:N with inventory_ledgers'],
    concurrencyControl: 'Immutable financial record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 36. IDEMPOTENCY_KEYS
  {
    tableName: 'idempotency_keys',
    schemaGroup: 'Sync & Idempotency',
    businessPurpose: 'Guarantees that repeated network requests with identical Idempotency-Key headers yield identical cached results and prevent duplicate billing or stock deduction.',
    primaryKey: '(tenant_id, key)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isPk: true, isFk: true },
      { name: 'key', type: 'VARCHAR(128)', nullable: false, description: 'Client supplied UUID idempotency key', isPk: true },
      { name: 'request_path', type: 'VARCHAR(255)', nullable: false, description: 'Target API route' },
      { name: 'request_hash', type: 'CHAR(64)', nullable: false, description: 'SHA-256 payload digest to detect parameter tampering' },
      { name: 'response_status', type: 'INT', nullable: false, description: 'HTTP response status code (e.g. 200, 201)' },
      { name: 'response_body', type: 'JSONB', nullable: false, description: 'Serialized response JSON' },
      { name: 'locked_until', type: 'TIMESTAMPTZ', nullable: true, description: 'In-flight distributed execution lock' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Created at' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', nullable: false, description: 'TTL purge timestamp (e.g. 72 hours)' }
    ],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [
      { name: 'idx_idempotency_expires', definition: 'CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);', purpose: 'Automated background cleanup job for expired keys' }
    ],
    relationships: ['N:1 with tenants'],
    concurrencyControl: 'Composite PK with lock timestamp.',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'created_at, expires_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 37. SYNC_OUTBOX & CHECKPOINTS
  {
    tableName: 'sync_checkpoints',
    schemaGroup: 'Sync & Idempotency',
    businessPurpose: 'Monitors client sync state and stores the monotonic checkpoint cursor for delta pulls per register terminal.',
    primaryKey: '(tenant_id, register_id, entity_type)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      { column: 'register_id', references: 'registers(id)', onDelete: 'CASCADE', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isPk: true, isFk: true },
      { name: 'register_id', type: 'UUID', nullable: false, description: 'Register terminal UUID', isPk: true, isFk: true },
      { name: 'entity_type', type: 'VARCHAR(64)', nullable: false, description: 'Domain collection (products, prices, taxes, customers)', isPk: true },
      { name: 'last_server_version', type: 'BIGINT', nullable: false, defaultVal: '0', description: 'Last acknowledged server mutation counter / timestamp' },
      { name: 'last_synced_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Last sync completion timestamp' }
    ],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [],
    relationships: ['N:1 with registers'],
    concurrencyControl: 'Upsert on (tenant_id, register_id, entity_type).',
    softDeleteStrategy: 'Hard Delete / State Enum',
    auditColumns: 'last_synced_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 38. SYNC_CONFLICT_LOGS
  {
    tableName: 'sync_conflict_logs',
    schemaGroup: 'Sync & Idempotency',
    businessPurpose: 'Logs all offline conflict resolutions (e.g. overselling occurrences, offline pricing mismatches, customer profile edits).',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'register_id', references: 'registers(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Log UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'register_id', type: 'UUID', nullable: false, description: 'Register that synced the transaction', isFk: true },
      { name: 'entity_type', type: 'VARCHAR(64)', nullable: false, description: 'INVENTORY_LEDGER, CUSTOMER, PRICING' },
      { name: 'entity_id', type: 'UUID', nullable: false, description: 'Conflicted entity UUID' },
      { name: 'client_payload', type: 'JSONB', nullable: false, description: 'Offline client mutation payload' },
      { name: 'server_state', type: 'JSONB', nullable: false, description: 'Server state at time of sync' },
      { name: 'resolution_strategy', type: 'VARCHAR(64)', nullable: false, description: 'COMMITTED_WITH_SHRINKAGE_VARIANCE, LAST_WRITE_WINS, REJECTED' },
      { name: 'resolved_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Timestamp of conflict resolution' }
    ],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [
      { name: 'idx_sync_conflicts_tenant', definition: 'CREATE INDEX idx_sync_conflicts_tenant ON sync_conflict_logs(tenant_id, resolved_at);', purpose: 'Audit inventory discrepancies and offline anomalies' }
    ],
    relationships: ['N:1 with registers'],
    concurrencyControl: 'Append-only audit log.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'resolved_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  },

  // 39. AUDIT_LOGS
  {
    tableName: 'audit_logs',
    schemaGroup: 'Audit & Compliance',
    businessPurpose: 'Tamper-evident audit trail capturing all administrative, security, and financial operations with user ID, IP address, before/after diffs, and cryptographic hash.',
    primaryKey: 'id (UUID)',
    foreignKeys: [
      { column: 'tenant_id', references: 'tenants(id)', onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      { column: 'user_id', references: 'users(id)', onDelete: 'SET NULL', onUpdate: 'CASCADE' }
    ],
    columns: [
      { name: 'id', type: 'UUID', nullable: false, defaultVal: 'gen_random_uuid()', description: 'Audit entry UUID', isPk: true },
      { name: 'tenant_id', type: 'UUID', nullable: false, description: 'Tenant isolation key', isFk: true },
      { name: 'user_id', type: 'UUID', nullable: true, description: 'Acting user UUID', isFk: true },
      { name: 'action', type: 'VARCHAR(64)', nullable: false, description: 'CREATE, UPDATE, DELETE, PRICE_OVERRIDE, CASH_DRAWER_FORCE_OPEN, SHIFT_CLOSE' },
      { name: 'table_name', type: 'VARCHAR(64)', nullable: false, description: 'Target database table' },
      { name: 'record_id', type: 'UUID', nullable: false, description: 'Target row UUID' },
      { name: 'old_values', type: 'JSONB', nullable: true, description: 'State before mutation' },
      { name: 'new_values', type: 'JSONB', nullable: true, description: 'State after mutation' },
      { name: 'ip_address', type: 'VARCHAR(45)', nullable: true, description: 'Client IP address' },
      { name: 'user_agent', type: 'TEXT', nullable: true, description: 'Client device browser / mobile app build' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'CURRENT_TIMESTAMP', description: 'Tamper-evident event timestamp' }
    ],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [
      { name: 'idx_audit_tenant_table_rec', definition: 'CREATE INDEX idx_audit_tenant_table_rec ON audit_logs(tenant_id, table_name, record_id);', purpose: 'Full audit history trace for any specific business entity' },
      { name: 'idx_audit_tenant_created', definition: 'CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at);', purpose: 'Security compliance and supervisory event review' }
    ],
    relationships: ['N:1 with tenants', 'N:1 with users'],
    concurrencyControl: 'Append-only immutable record.',
    softDeleteStrategy: 'Strictly Immutable (No Updates or Deletes)',
    auditColumns: 'created_at',
    rlsPolicyDefinition: 'USING (tenant_id = current_setting(\'app.current_tenant_id\')::UUID)'
  }
];
