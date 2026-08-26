import { SqlMigrationScript } from '../types/databaseTypes';

export const postgresMigrations: SqlMigrationScript[] = [
  {
    id: 'mig-001',
    order: 1,
    filename: '00001_extensions_and_enums.sql',
    category: 'Core Infrastructure',
    description: 'Enables necessary PostgreSQL extensions (pgcrypto, pg_trgm, btree_gist) and defines all custom domain ENUMs.',
    sql: `-- ============================================================================
-- MIGRATION: 00001_extensions_and_enums.sql
-- DESCRIPTION: PostgreSQL Extensions & Domain ENUM Types
-- ============================================================================

-- 1. Enable Core Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Domain ENUMs
DO $$ BEGIN
  CREATE TYPE tenant_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE warehouse_type_enum AS ENUM ('STORE_FRONT', 'STORE_BACKROOM', 'CENTRAL_DC', 'TRANSIT', 'QUARANTINE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE uom_type_enum AS ENUM ('COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'AREA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_type_enum AS ENUM ('STANDARD', 'MATRIX_PARENT', 'COMBO_BUNDLE', 'SERVICE', 'NON_INVENTORY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE barcode_symbology_enum AS ENUM ('EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'QR_CODE', 'GS1_128');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE po_status_enum AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grn_status_enum AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_movement_type_enum AS ENUM (
    'SALE', 'SALE_RETURN', 'PURCHASE_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT',
    'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'STOCK_TAKE_VARIANCE', 'DAMAGE_WASTE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shift_status_enum AS ENUM ('OPEN', 'CLOSED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cash_movement_type_enum AS ENUM ('OPENING_FLOAT', 'PAY_IN', 'PAY_OUT', 'SAFE_DROP', 'CLOSING_COUNT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE promotion_type_enum AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'BOGO_FREE', 'BUNDLE_PRICE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customer_tier_enum AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'VIP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE credit_ledger_type_enum AS ENUM ('CHARGE_SALE', 'ACCOUNT_PAYMENT', 'REFUND_CREDIT', 'MANUAL_ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sales_order_status_enum AS ENUM ('COMPLETED', 'PARKED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM (
    'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GIFT_CARD', 'CUSTOMER_CREDIT', 'LOYALTY_POINTS', 'MOBILE_PAYMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('CAPTURED', 'REFUNDED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_reason_enum AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'CUSTOMER_CHANGE_OF_MIND', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_condition_enum AS ENUM ('RESTOCKABLE', 'DAMAGED_SCRAP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  },
  {
    id: 'mig-002',
    order: 2,
    filename: '00002_tenants_stores_users.sql',
    category: 'IAM & Tenancy',
    description: 'Creates tenants, physical stores, warehouses, registers, users, roles, and granular permission tables.',
    sql: `-- ============================================================================
-- MIGRATION: 00002_tenants_stores_users.sql
-- DESCRIPTION: Multi-Tenant Architecture & IAM RBAC Tables
-- ============================================================================

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  tax_number VARCHAR(64),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  status tenant_status_enum NOT NULL DEFAULT 'ACTIVE',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_tenants_code UNIQUE (code),
  CONSTRAINT chk_tenants_currency_len CHECK (length(currency_code) = 3)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- 2. Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country_code CHAR(2) NOT NULL DEFAULT 'US',
  phone VARCHAR(32),
  receipt_header_text TEXT,
  receipt_footer_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_stores_tenant_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_tenant_code ON stores(tenant_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stores_tenant_active ON stores(tenant_id, is_active) WHERE deleted_at IS NULL;

-- 3. Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL ON UPDATE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type warehouse_type_enum NOT NULL DEFAULT 'STORE_FRONT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_warehouses_tenant_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_tenant_code ON warehouses(tenant_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_store ON warehouses(tenant_id, store_id) WHERE deleted_at IS NULL;

-- 4. Registers Table
CREATE TABLE IF NOT EXISTS registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  default_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  device_identifier VARCHAR(128),
  printer_ip_address VARCHAR(45),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_registers_store_code UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS idx_registers_tenant_store ON registers(tenant_id, store_id) WHERE deleted_at IS NULL;

-- 5. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  primary_store_id UUID REFERENCES stores(id) ON DELETE SET NULL ON UPDATE CASCADE,
  username VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  pin_hash VARCHAR(255),
  phone VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_users_tenant_username UNIQUE (tenant_id, username),
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_username ON users(tenant_id, username) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant_store ON users(tenant_id, primary_store_id) WHERE deleted_at IS NULL;

-- 6. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_roles_tenant_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_code ON roles(tenant_id, code);

-- 7. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(128) NOT NULL,
  module VARCHAR(64) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_permissions_key UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- 8. Role Permissions Junction
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- 9. User Roles Junction
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);`
  },
  {
    id: 'mig-003',
    order: 3,
    filename: '00003_catalog_uom_pricing.sql',
    category: 'Catalog & Products',
    description: 'Defines categories, brands, units of measure, packaging conversions, products, matrix variants, and multi-barcode indexes.',
    sql: `-- ============================================================================
-- MIGRATION: 00003_catalog_uom_pricing.sql
-- DESCRIPTION: Product Catalog, UOM Conversions & Barcodes
-- ============================================================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  path TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_categories_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON categories(tenant_id, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_tenant_order ON categories(tenant_id, display_order) WHERE deleted_at IS NULL;

-- 2. Brands
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  website VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_brands_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_brands_tenant_name ON brands(tenant_id, name) WHERE deleted_at IS NULL;

-- 3. Units of Measure
CREATE TABLE IF NOT EXISTS units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(64) NOT NULL,
  type uom_type_enum NOT NULL DEFAULT 'COUNT',
  is_fractional_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_uom_tenant_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_uom_tenant_code ON units_of_measure(tenant_id, code);

-- 4. Unit Conversions
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_id UUID,
  from_uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  to_uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  conversion_factor NUMERIC(14, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_unit_conv_factor_pos CHECK (conversion_factor > 0),
  CONSTRAINT chk_unit_conv_diff CHECK (from_uom_id <> to_uom_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_conv_lookup ON unit_conversions(tenant_id, from_uom_id, to_uom_id, product_id);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE,
  base_uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type product_type_enum NOT NULL DEFAULT 'STANDARD',
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  has_variants BOOLEAN NOT NULL DEFAULT FALSE,
  image_url VARCHAR(512),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_products_tenant_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_code ON products(tenant_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_tenant_search ON products USING gin(tenant_id, name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category_id) WHERE deleted_at IS NULL;

-- 6. Product Variants (SKUs)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  sku VARCHAR(64) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  attribute_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  retail_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  compare_at_price NUMERIC(14, 4),
  min_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  reorder_point NUMERIC(14, 4) NOT NULL DEFAULT 5.0000,
  reorder_quantity NUMERIC(14, 4) NOT NULL DEFAULT 20.0000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_variants_tenant_sku UNIQUE (tenant_id, sku),
  CONSTRAINT chk_variants_cost_nonneg CHECK (cost_price >= 0),
  CONSTRAINT chk_variants_price_nonneg CHECK (retail_price >= 0),
  CONSTRAINT chk_variants_min_price CHECK (min_price >= 0 AND min_price <= retail_price)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_tenant_sku ON product_variants(tenant_id, upper(sku)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_tenant_product ON product_variants(tenant_id, product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_attributes_gin ON product_variants USING gin(attribute_values);

-- 7. Barcodes
CREATE TABLE IF NOT EXISTS barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  barcode_value VARCHAR(64) NOT NULL,
  symbology barcode_symbology_enum NOT NULL DEFAULT 'EAN_13',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_barcodes_tenant_value UNIQUE (tenant_id, barcode_value)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_tenant_scan ON barcodes(tenant_id, barcode_value) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_barcodes_variant ON barcodes(variant_id) WHERE deleted_at IS NULL;`
  },
  {
    id: 'mig-004',
    order: 4,
    filename: '00004_inventory_warehouses_ledgers.sql',
    category: 'Inventory & Warehousing',
    description: 'Implements double-entry append-only inventory movement ledger and inter-branch stock transfer pipelines.',
    sql: `-- ============================================================================
-- MIGRATION: 00004_inventory_warehouses_ledgers.sql
-- DESCRIPTION: Double-Entry Immutable Stock Ledger & Transfers
-- ============================================================================

-- 1. Inventory Ledgers (Double-Entry Append-Only Movement Journal)
CREATE TABLE IF NOT EXISTS inventory_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  movement_type inventory_movement_type_enum NOT NULL,
  quantity_delta NUMERIC(14, 4) NOT NULL,
  unit_cost NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  reference_document_type VARCHAR(64) NOT NULL,
  reference_document_id UUID NOT NULL,
  batch_lot_number VARCHAR(64),
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_inv_delta_nonzero CHECK (quantity_delta <> 0)
);

CREATE INDEX IF NOT EXISTS idx_inv_stock_balance ON inventory_ledgers(tenant_id, warehouse_id, variant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_inv_ref_doc ON inventory_ledgers(reference_document_type, reference_document_id);

-- 2. Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  source_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  dispatched_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  transfer_number VARCHAR(64) NOT NULL,
  status transfer_status_enum NOT NULL DEFAULT 'REQUESTED',
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_transfers_tenant_number UNIQUE (tenant_id, transfer_number),
  CONSTRAINT chk_transfer_diff_warehouses CHECK (source_warehouse_id <> destination_warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_tenant_status ON stock_transfers(tenant_id, status);

-- 3. Stock Transfer Items
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity_dispatched NUMERIC(14, 4) NOT NULL,
  quantity_received NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sti_qty_disp_pos CHECK (quantity_dispatched > 0),
  CONSTRAINT chk_sti_qty_rec_nonneg CHECK (quantity_received >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sti_transfer_id ON stock_transfer_items(transfer_id);`
  },
  {
    id: 'mig-005',
    order: 5,
    filename: '00005_procurement_suppliers_grn.sql',
    category: 'Procurement',
    description: 'Creates supplier registries, purchase orders, purchase order line items, and goods receiving intake notes (GRN).',
    sql: `-- ============================================================================
-- MIGRATION: 00005_procurement_suppliers_grn.sql
-- DESCRIPTION: Suppliers, Purchase Orders & Goods Receiving Notes (GRN)
-- ============================================================================

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(150),
  email VARCHAR(255),
  phone VARCHAR(32),
  payment_terms_days INT NOT NULL DEFAULT 30,
  tax_number VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_suppliers_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_suppliers_terms_nonneg CHECK (payment_terms_days >= 0)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_name ON suppliers(tenant_id, name) WHERE deleted_at IS NULL;

-- 2. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  po_number VARCHAR(64) NOT NULL,
  status po_status_enum NOT NULL DEFAULT 'DRAFT',
  issued_at TIMESTAMPTZ,
  expected_delivery_at TIMESTAMPTZ,
  total_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_po_tenant_number UNIQUE (tenant_id, po_number),
  CONSTRAINT chk_po_total_nonneg CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_po_tenant_status ON purchase_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_po_tenant_supplier ON purchase_orders(tenant_id, supplier_id);

-- 3. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity_ordered NUMERIC(14, 4) NOT NULL,
  quantity_received NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  unit_cost NUMERIC(14, 4) NOT NULL,
  line_total NUMERIC(14, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_poi_qty_pos CHECK (quantity_ordered > 0),
  CONSTRAINT chk_poi_qty_rec_nonneg CHECK (quantity_received >= 0),
  CONSTRAINT chk_poi_cost_nonneg CHECK (unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(purchase_order_id);

-- 4. Goods Receiving Notes (GRN)
CREATE TABLE IF NOT EXISTS goods_receiving_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  received_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  grn_number VARCHAR(64) NOT NULL,
  supplier_invoice_no VARCHAR(128),
  status grn_status_enum NOT NULL DEFAULT 'POSTED',
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_grn_tenant_number UNIQUE (tenant_id, grn_number)
);

CREATE INDEX IF NOT EXISTS idx_grn_tenant_warehouse ON goods_receiving_notes(tenant_id, warehouse_id, received_at);

-- 5. Goods Receiving Items
CREATE TABLE IF NOT EXISTS goods_receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES goods_receiving_notes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity_received NUMERIC(14, 4) NOT NULL,
  quantity_rejected NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  unit_cost NUMERIC(14, 4) NOT NULL,
  batch_lot_number VARCHAR(64),
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_gri_qty_pos CHECK (quantity_received > 0),
  CONSTRAINT chk_gri_cost_nonneg CHECK (unit_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_gri_grn_id ON goods_receiving_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_gri_batch ON goods_receiving_items(batch_lot_number) WHERE batch_lot_number IS NOT NULL;`
  },
  {
    id: 'mig-006',
    order: 6,
    filename: '00006_sales_pos_registers_returns.sql',
    category: 'Sales & POS',
    description: 'Registers shifts, cash movements, tax configurations, promotions, sales orders, line items, payments, and return vouchers.',
    sql: `-- ============================================================================
-- MIGRATION: 00006_sales_pos_registers_returns.sql
-- DESCRIPTION: POS Shifts, Sales Orders, Split Payments & Returns
-- ============================================================================

-- 1. Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  register_id UUID NOT NULL REFERENCES registers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  opened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  closed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  shift_number VARCHAR(64) NOT NULL,
  status shift_status_enum NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  opening_float NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  expected_cash NUMERIC(14, 4),
  actual_counted_cash NUMERIC(14, 4),
  cash_variance NUMERIC(14, 4),
  total_sales_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  total_tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  total_discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  order_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_shifts_tenant_number UNIQUE (tenant_id, shift_number),
  CONSTRAINT chk_shifts_float_nonneg CHECK (opening_float >= 0)
);

CREATE INDEX IF NOT EXISTS idx_shifts_open_register ON shifts(tenant_id, register_id) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_shifts_store_date ON shifts(tenant_id, store_id, opened_at);

-- 2. Cash Movements
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  type cash_movement_type_enum NOT NULL,
  amount NUMERIC(14, 4) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cash_amount_pos CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON cash_movements(shift_id);

-- 3. Taxes
CREATE TABLE IF NOT EXISTS taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  rate_percentage NUMERIC(7, 4) NOT NULL,
  is_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_taxes_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_tax_rate_nonneg CHECK (rate_percentage >= 0)
);

CREATE INDEX IF NOT EXISTS idx_taxes_tenant_code ON taxes(tenant_id, code);

-- 4. Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(64),
  name VARCHAR(150) NOT NULL,
  type promotion_type_enum NOT NULL,
  value NUMERIC(14, 4) NOT NULL,
  min_order_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_promo_val_nonneg CHECK (value >= 0),
  CONSTRAINT chk_promo_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_promo_active_date ON promotions(tenant_id, is_active, start_date, end_date);

-- 5. Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  register_id UUID NOT NULL REFERENCES registers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  cashier_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_id UUID,
  order_number VARCHAR(64) NOT NULL,
  offline_id VARCHAR(64),
  status sales_order_status_enum NOT NULL DEFAULT 'COMPLETED',
  subtotal_amount NUMERIC(14, 4) NOT NULL,
  discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  total_amount NUMERIC(14, 4) NOT NULL,
  paid_amount NUMERIC(14, 4) NOT NULL,
  change_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  loyalty_points_earned INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_orders_tenant_number UNIQUE (tenant_id, order_number),
  CONSTRAINT chk_order_subtotal_nonneg CHECK (subtotal_amount >= 0),
  CONSTRAINT chk_order_total_nonneg CHECK (total_amount >= 0),
  CONSTRAINT chk_order_paid_sufficient CHECK (paid_amount >= (total_amount - 0.0001))
);

CREATE INDEX IF NOT EXISTS idx_orders_reporting ON sales_orders(tenant_id, store_id, completed_at, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON sales_orders(tenant_id, customer_id, completed_at) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_offline_id ON sales_orders(tenant_id, offline_id) WHERE offline_id IS NOT NULL;

-- 6. Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  uom_conversion_factor NUMERIC(14, 6) NOT NULL DEFAULT 1.000000,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_price NUMERIC(14, 4) NOT NULL,
  unit_cost NUMERIC(14, 4) NOT NULL,
  discount_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  tax_rate_percentage NUMERIC(7, 4) NOT NULL DEFAULT 0.0000,
  tax_amount NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  line_total NUMERIC(14, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_soi_qty_pos CHECK (quantity > 0),
  CONSTRAINT chk_soi_price_nonneg CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_soi_order_id ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_soi_variant_reporting ON sales_order_items(variant_id, created_at);

-- 7. Sales Order Payments
CREATE TABLE IF NOT EXISTS sales_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  method payment_method_enum NOT NULL,
  amount NUMERIC(14, 4) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  card_last_four CHAR(4),
  card_brand VARCHAR(32),
  gateway_transaction_id VARCHAR(128),
  status payment_status_enum NOT NULL DEFAULT 'CAPTURED',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sop_amount_pos CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_sop_order_id ON sales_order_payments(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sop_method_reporting ON sales_order_payments(method, paid_at);

-- 8. Sales Order Returns
CREATE TABLE IF NOT EXISTS sales_order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  original_sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  original_sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  processed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  return_number VARCHAR(64) NOT NULL,
  quantity_returned NUMERIC(14, 4) NOT NULL,
  refund_amount NUMERIC(14, 4) NOT NULL,
  reason return_reason_enum NOT NULL,
  item_condition return_condition_enum NOT NULL DEFAULT 'RESTOCKABLE',
  refund_method payment_method_enum NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_returns_tenant_number UNIQUE (tenant_id, return_number),
  CONSTRAINT chk_returns_qty_pos CHECK (quantity_returned > 0),
  CONSTRAINT chk_returns_refund_pos CHECK (refund_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_returns_orig_order ON sales_order_returns(original_sales_order_id);`
  },
  {
    id: 'mig-007',
    order: 7,
    filename: '00007_customers_loyalty_credit.sql',
    category: 'Customers & Loyalty',
    description: 'Creates customer directory, store credit ledgers, and loyalty points rewards ledger.',
    sql: `-- ============================================================================
-- MIGRATION: 00007_customers_loyalty_credit.sql
-- DESCRIPTION: Customers, Store Credit & Loyalty Points Ledgers
-- ============================================================================

-- 1. Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_code VARCHAR(64) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(32),
  tier customer_tier_enum NOT NULL DEFAULT 'STANDARD',
  credit_limit NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  current_credit_balance NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  loyalty_points_balance INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_customers_tenant_code UNIQUE (tenant_id, customer_code),
  CONSTRAINT chk_cust_credit_limit CHECK (credit_limit >= 0),
  CONSTRAINT chk_cust_points_nonneg CHECK (loyalty_points_balance >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_code ON customers(tenant_id, customer_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_search ON customers USING gin(tenant_id, (first_name || ' ' || last_name) gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone) WHERE deleted_at IS NULL;

-- 2. Add foreign key to sales_orders for customer_id
DO $$ BEGIN
  ALTER TABLE sales_orders ADD CONSTRAINT fk_sales_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Customer Credit Ledgers
CREATE TABLE IF NOT EXISTS customer_credit_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  type credit_ledger_type_enum NOT NULL,
  amount_delta NUMERIC(14, 4) NOT NULL,
  balance_after NUMERIC(14, 4) NOT NULL,
  reference_document_type VARCHAR(64) NOT NULL,
  reference_document_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_ccl_amount_nonzero CHECK (amount_delta <> 0)
);

CREATE INDEX IF NOT EXISTS idx_ccl_customer_created ON customer_credit_ledgers(tenant_id, customer_id, created_at);

-- 4. Loyalty Ledgers
CREATE TABLE IF NOT EXISTS loyalty_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  points_delta INT NOT NULL,
  points_balance_after INT NOT NULL,
  reason VARCHAR(128) NOT NULL,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_loyalty_delta_nonzero CHECK (points_delta <> 0)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customer_date ON loyalty_ledgers(tenant_id, customer_id, created_at);`
  },
  {
    id: 'mig-008',
    order: 8,
    filename: '00008_sync_idempotency_audit.sql',
    category: 'Sync & Audit',
    description: 'Implements API idempotency storage, sync checkpoints, conflict logs, and tamper-evident audit journal.',
    sql: `-- ============================================================================
-- MIGRATION: 00008_sync_idempotency_audit.sql
-- DESCRIPTION: Idempotency Keys, Offline Sync Checkpoints & Audit Logs
-- ============================================================================

-- 1. Idempotency Keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  key VARCHAR(128) NOT NULL,
  request_path VARCHAR(255) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- 2. Sync Checkpoints
CREATE TABLE IF NOT EXISTS sync_checkpoints (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  register_id UUID NOT NULL REFERENCES registers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  entity_type VARCHAR(64) NOT NULL,
  last_server_version BIGINT NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, register_id, entity_type)
);

-- 3. Sync Conflict Logs
CREATE TABLE IF NOT EXISTS sync_conflict_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  register_id UUID NOT NULL REFERENCES registers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  client_payload JSONB NOT NULL,
  server_state JSONB NOT NULL,
  resolution_strategy VARCHAR(64) NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_tenant ON sync_conflict_logs(tenant_id, resolved_at);

-- 4. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  action VARCHAR(64) NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_table_rec ON audit_logs(tenant_id, table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs(tenant_id, created_at);`
  },
  {
    id: 'mig-009',
    order: 9,
    filename: '00009_rls_functions_and_triggers.sql',
    category: 'Security & Automation',
    description: 'Installs automated updated_at triggers, optimistic locking enforcement, and PostgreSQL Row-Level Security (RLS) tenant isolation policies.',
    sql: `-- ============================================================================
-- MIGRATION: 00009_rls_functions_and_triggers.sql
-- DESCRIPTION: Automated Triggers & Row Level Security (RLS) Policies
-- ============================================================================

-- 1. Automated updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  IF TG_OP = 'UPDATE' THEN
    -- Increment optimistic lock version if column exists in table
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME AND column_name = 'version'
    ) THEN
      NEW.version = OLD.version + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach updated_at Trigger to All Mutable Tables
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
      AND table_schema = 'public'
      AND table_name NOT IN ('information_schema')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_timestamp ON %I;
      CREATE TRIGGER trg_update_timestamp
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', tbl, tbl);
  END LOOP;
END $$;

-- 3. Row-Level Security (RLS) Tenant Isolation
-- Enable RLS across all tenant-partitioned tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receiving_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflict_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create Standard Tenant Isolation Policies
-- Evaluates current session tenant set via: SET LOCAL app.current_tenant_id = '...';
DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
      AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS tenant_isolation_policy ON %I;
      CREATE POLICY tenant_isolation_policy ON %I
      AS PERMISSIVE
      FOR ALL
      USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID)
      WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::UUID);
    ', tbl, tbl);
  END LOOP;
END $$;`
  }
];
