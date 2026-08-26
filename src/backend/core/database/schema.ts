import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  boolean, 
  numeric, 
  integer, 
  timestamp, 
  jsonb, 
  char,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';

// 1. Tenants Table
export const tenantsTable = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  taxNumber: varchar('tax_number', { length: 64 }),
  currencyCode: char('currency_code', { length: 3 }).notNull().default('USD'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
  status: varchar('status', { length: 32 }).notNull().default('ACTIVE'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 2. Stores Table
export const storesTable = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  addressLine1: varchar('address_line1', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  countryCode: char('country_code', { length: 2 }).notNull().default('US'),
  phone: varchar('phone', { length: 32 }),
  receiptHeaderText: text('receipt_header_text'),
  receiptFooterText: text('receipt_footer_text'),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 3. Warehouses Table
export const warehousesTable = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  storeId: uuid('store_id').references(() => storesTable.id),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull().default('STORE_FRONT'),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 4. Registers Table
export const registersTable = pgTable('registers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  storeId: uuid('store_id').notNull().references(() => storesTable.id),
  defaultWarehouseId: uuid('default_warehouse_id').notNull().references(() => warehousesTable.id),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  deviceIdentifier: varchar('device_identifier', { length: 128 }),
  printerIpAddress: varchar('printer_ip_address', { length: 45 }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 5. Users Table
export const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  primaryStoreId: uuid('primary_store_id').references(() => storesTable.id),
  username: varchar('username', { length: 64 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  pinHash: varchar('pin_hash', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 6. Roles Table
export const rolesTable = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Permissions Table
export const permissionsTable = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 128 }).notNull().unique(),
  module: varchar('module', { length: 64 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Categories Table
export const categoriesTable = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  parentId: uuid('parent_id'),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  path: text('path'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 9. Products & Variants Table
export const productsTable = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  categoryId: uuid('category_id').references(() => categoriesTable.id),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 32 }).notNull().default('STANDARD'),
  isTaxable: boolean('is_taxable').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const productVariantsTable = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  productId: uuid('product_id').notNull().references(() => productsTable.id),
  sku: varchar('sku', { length: 64 }).notNull(),
  variantName: varchar('variant_name', { length: 255 }).notNull(),
  costPrice: numeric('cost_price', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  retailPrice: numeric('retail_price', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  compareAtPrice: numeric('compare_at_price', { precision: 14, scale: 4 }),
  minPrice: numeric('min_price', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  reorderPoint: numeric('reorder_point', { precision: 14, scale: 4 }).notNull().default('5.0000'),
  reorderQuantity: numeric('reorder_quantity', { precision: 14, scale: 4 }).notNull().default('20.0000'),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 10. Suppliers Table
export const suppliersTable = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  code: varchar('code', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 150 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  paymentTermsDays: integer('payment_terms_days').notNull().default(30),
  taxNumber: varchar('tax_number', { length: 64 }),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 11. Customers Table
export const customersTable = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  customerCode: varchar('customer_code', { length: 64 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  tier: varchar('tier', { length: 32 }).notNull().default('STANDARD'),
  creditLimit: numeric('credit_limit', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  currentCreditBalance: numeric('current_credit_balance', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  loyaltyPointsBalance: integer('loyalty_points_balance').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// 12. Inventory Ledgers Table (Double-Entry Append-Only)
export const inventoryLedgersTable = pgTable('inventory_ledgers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehousesTable.id),
  variantId: uuid('variant_id').notNull().references(() => productVariantsTable.id),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => usersTable.id),
  movementType: varchar('movement_type', { length: 64 }).notNull(),
  quantityDelta: numeric('quantity_delta', { precision: 14, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  referenceDocumentType: varchar('reference_document_type', { length: 64 }).notNull(),
  referenceDocumentId: uuid('reference_document_id').notNull(),
  batchLotNumber: varchar('batch_lot_number', { length: 64 }),
  notes: text('notes'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Sales Orders & Items Table
export const salesOrdersTable = pgTable('sales_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenantsTable.id),
  storeId: uuid('store_id').notNull().references(() => storesTable.id),
  registerId: uuid('register_id').notNull().references(() => registersTable.id),
  shiftId: uuid('shift_id').notNull(),
  cashierUserId: uuid('cashier_user_id').notNull().references(() => usersTable.id),
  customerId: uuid('customer_id').references(() => customersTable.id),
  orderNumber: varchar('order_number', { length: 64 }).notNull(),
  offlineId: varchar('offline_id', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('COMPLETED'),
  subtotalAmount: numeric('subtotal_amount', { precision: 14, scale: 4 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 4 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 4 }).notNull(),
  changeAmount: numeric('change_amount', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  loyaltyPointsEarned: integer('loyalty_points_earned').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const salesOrderItemsTable = pgTable('sales_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  salesOrderId: uuid('sales_order_id').notNull().references(() => salesOrdersTable.id),
  variantId: uuid('variant_id').notNull().references(() => productVariantsTable.id),
  uomId: uuid('uom_id').notNull(),
  uomConversionFactor: numeric('uom_conversion_factor', { precision: 14, scale: 6 }).notNull().default('1.000000'),
  quantity: numeric('quantity', { precision: 14, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 4 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  taxRatePercentage: numeric('tax_rate_percentage', { precision: 7, scale: 4 }).notNull().default('0.0000'),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 4 }).notNull().default('0.0000'),
  lineTotal: numeric('line_total', { precision: 14, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
