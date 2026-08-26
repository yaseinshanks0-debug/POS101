import { AggregateRoot, Entity } from '../../core/domain/Entity';

// ============================================================================
// 1. POS REGISTER SHIFTS DOMAIN
// ============================================================================
export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface RegisterShiftProps {
  tenantId: string;
  storeId: string;
  registerId: string;
  cashierUserId: string;
  openingCashAmount: number;
  closingCashAmount?: number;
  expectedCashAmount?: number;
  cashDifference?: number;
  status: ShiftStatus;
  openedAt: Date;
  closedAt?: Date;
}

export class RegisterShiftEntity extends AggregateRoot<RegisterShiftProps> {
  get registerId(): string { return this.props.registerId; }
  get storeId(): string { return this.props.storeId; }
  get cashierUserId(): string { return this.props.cashierUserId; }
  get status(): ShiftStatus { return this.props.status; }
  get openingCashAmount(): number { return this.props.openingCashAmount; }
  get closingCashAmount(): number | undefined { return this.props.closingCashAmount; }
  get expectedCashAmount(): number | undefined { return this.props.expectedCashAmount; }
  get cashDifference(): number | undefined { return this.props.cashDifference; }
  get openedAt(): Date { return this.props.openedAt; }
  get closedAt(): Date | undefined { return this.props.closedAt; }

  public closeShift(actualCash: number, expectedCash: number): void {
    if (this.props.status !== 'OPEN') throw new Error('Shift is already closed');
    this.props.closingCashAmount = actualCash;
    this.props.expectedCashAmount = expectedCash;
    this.props.cashDifference = actualCash - expectedCash;
    this.props.status = 'CLOSED';
    this.props.closedAt = new Date();
    this.touch();
  }
}

// ============================================================================
// 2. POS SALES ORDERS & SPLIT PAYMENTS DOMAIN
// ============================================================================
export type SalesOrderStatus = 'COMPLETED' | 'HELD' | 'REFUNDED' | 'VOIDED';

export interface SalesOrderItem {
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  taxRatePercentage: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PaymentSplit {
  method: 'CASH' | 'CARD' | 'STORE_CREDIT' | 'LOYALTY_POINTS' | 'GIFT_CARD';
  amount: number;
  referenceNumber?: string;
}

export interface SalesOrderProps {
  tenantId: string;
  storeId: string;
  registerId: string;
  shiftId: string;
  cashierUserId: string;
  customerId?: string;
  orderNumber: string;
  offlineId?: string;
  status: SalesOrderStatus;
  items: SalesOrderItem[];
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  payments: PaymentSplit[];
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  completedAt: Date;
}

export class SalesOrderEntity extends AggregateRoot<SalesOrderProps> {
  get orderNumber(): string { return this.props.orderNumber; }
  get totalAmount(): number { return this.props.totalAmount; }
  get status(): SalesOrderStatus { return this.props.status; }
  get items(): SalesOrderItem[] { return this.props.items; }
  get customerId(): string | undefined { return this.props.customerId; }
  get paidAmount(): number { return this.props.paidAmount; }
  get shiftId(): string { return this.props.shiftId; }
  get subtotalAmount(): number { return this.props.subtotalAmount; }
  get discountAmount(): number { return this.props.discountAmount; }
  get taxAmount(): number { return this.props.taxAmount; }
  get changeAmount(): number { return this.props.changeAmount; }
  get payments(): PaymentSplit[] { return this.props.payments; }
  get loyaltyPointsEarned(): number { return this.props.loyaltyPointsEarned; }
  get completedAt(): Date { return this.props.completedAt; }

  public voidOrder(): void {
    if (this.props.status !== 'COMPLETED') throw new Error('Only completed orders can be voided');
    this.props.status = 'VOIDED';
    this.touch();
  }

  public refund(): void {
    this.props.status = 'REFUNDED';
    this.touch();
  }
}

// ============================================================================
// 3. SALES RETURNS & REFUNDS DOMAIN
// ============================================================================
export interface ReturnItem {
  variantId: string;
  quantity: number;
  refundAmount: number;
  restockIntoInventory: boolean;
  reason: string;
}

export interface SalesReturnProps {
  tenantId: string;
  originalOrderId: string;
  returnNumber: string;
  processedByUserId: string;
  items: ReturnItem[];
  totalRefundAmount: number;
  refundPaymentMethod: 'CASH' | 'CARD' | 'STORE_CREDIT';
  processedAt: Date;
}

export class SalesReturnEntity extends AggregateRoot<SalesReturnProps> {
  get returnNumber(): string { return this.props.returnNumber; }
  get originalOrderId(): string { return this.props.originalOrderId; }
  get totalRefundAmount(): number { return this.props.totalRefundAmount; }
  get items(): ReturnItem[] { return this.props.items; }
  get processedByUserId(): string { return this.props.processedByUserId; }
}

// ============================================================================
// 4. PROMOTIONS & DISCOUNTS DOMAIN
// ============================================================================
export interface PromotionProps {
  tenantId: string;
  code: string;
  name: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
  discountValue: number;
  minOrderAmount?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export class PromotionEntity extends AggregateRoot<PromotionProps> {
  get code(): string { return this.props.code; }
  get discountType(): string { return this.props.discountType; }
  get discountValue(): number { return this.props.discountValue; }

  public isValidNow(orderAmount: number): boolean {
    const now = new Date();
    if (!this.props.isActive) return false;
    if (now < this.props.startDate || now > this.props.endDate) return false;
    if (this.props.minOrderAmount && orderAmount < this.props.minOrderAmount) return false;
    return true;
  }
}
