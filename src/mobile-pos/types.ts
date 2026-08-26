export type DeviceOrientation = 'phone-portrait' | 'phone-landscape' | 'tablet-landscape' | 'tablet-portrait';
export type AppLanguage = 'en' | 'ar';
export type AppTheme = 'dark' | 'light';

export type PosScreenTab = 
  | 'dashboard'
  | 'pos'
  | 'scanner'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'purchasing'
  | 'reports'
  | 'outbox'
  | 'hardware'
  | 'auth';

export interface MobileUser {
  id: string;
  name: string;
  nameAr: string;
  role: 'CASHIER' | 'STORE_MANAGER' | 'ADMIN';
  pin: string;
  avatar: string;
  storeId: string;
  storeName: string;
}

export interface MobileProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  variantName: string;
  variantNameAr: string;
  retailPrice: number;
  costPrice: number;
  minPrice: number;
  stockOnHand: number;
  reorderPoint: number;
}

export interface MobileProduct {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  isTaxable: boolean;
  isFavorite: boolean;
  color: string;
  icon: string;
  image?: string;
  variants: MobileProductVariant[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productNameAr: string;
  variantName: string;
  variantNameAr: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isTaxable: boolean;
  notes?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  phone: string;
  email: string;
  creditLimit: number;
  creditBalance: number;
  loyaltyPoints: number;
  tier: 'REGULAR' | 'SILVER' | 'VIP';
  totalSpend?: number;
  totalVisits?: number;
}

export interface HeldSale {
  id: string;
  ticketNumber: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  note: string;
  heldAt: string;
  cashierName: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'STORE_CREDIT' | 'LOYALTY_POINTS' | 'GIFT_CARD';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  cardLast4?: string;
}

export interface MobileSalesOrder {
  id: string;
  orderNumber: string;
  offlineId: string;
  storeId: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  payments: PaymentSplit[];
  status: 'COMPLETED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'VOIDED';
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  createdAt: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  idempotencyKey: string;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  type: 'SALE' | 'PURCHASE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN';
  quantityDelta: number;
  unitCost: number;
  referenceId: string;
  sourceLocation: string;
  destinationLocation: string;
  actor: string;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  paymentTerms: string;
}

export interface PurchaseOrderItem {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  destinationStore: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDate: string;
  totalCost: number;
  items: PurchaseOrderItem[];
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceStoreId: string;
  sourceStoreName: string;
  destStoreId: string;
  destStoreName: string;
  status: 'DRAFT' | 'DISPATCHED' | 'RECEIVED';
  items: {
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
  }[];
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
}

export interface OutboxMutation {
  id: string;
  operationId: string;
  entityType: 'SALES_ORDER' | 'STOCK_MOVEMENT' | 'CUSTOMER' | 'SHIFT' | 'TRANSFER';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  deviceId: string;
  userId: string;
  timestamp: string;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  retryCount: number;
  errorMessage?: string;
  idempotencyKey: string;
}

export interface HardwareStatus {
  bluetoothPrinterConnected: boolean;
  printerPaperStatus: 'OK' | 'LOW' | 'OUT';
  printerModel: string;
  usbScannerConnected: boolean;
  cashDrawerConnected: boolean;
  nfcReaderActive: boolean;
  lastDrawerKickTime?: string;
}
