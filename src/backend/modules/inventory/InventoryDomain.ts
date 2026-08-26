import { AggregateRoot, Entity } from '../../core/domain/Entity';

// ============================================================================
// 1. INVENTORY LEDGER (Double-Entry Append-Only)
// ============================================================================
export type StockMovementType =
  | 'PURCHASE_RECEIPT'
  | 'POS_SALE'
  | 'SALE_RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'CYCLE_COUNT_ADJUSTMENT'
  | 'DAMAGE_SCRAP';

export interface InventoryLedgerProps {
  tenantId: string;
  warehouseId: string;
  variantId: string;
  createdByUserId: string;
  movementType: StockMovementType;
  quantityDelta: number; // positive = stock in, negative = stock out
  unitCost: number;
  referenceDocumentType: string;
  referenceDocumentId: string;
  notes?: string;
  occurredAt: Date;
}

export class InventoryLedgerEntity extends Entity<InventoryLedgerProps> {
  get warehouseId(): string { return this.props.warehouseId; }
  get variantId(): string { return this.props.variantId; }
  get movementType(): StockMovementType { return this.props.movementType; }
  get quantityDelta(): number { return this.props.quantityDelta; }
  get unitCost(): number { return this.props.unitCost; }
  get referenceDocumentType(): string { return this.props.referenceDocumentType; }
  get referenceDocumentId(): string { return this.props.referenceDocumentId; }
}

// ============================================================================
// 2. PURCHASE ORDERS & GOODS RECEIVING DOMAIN
// ============================================================================
export type PurchaseOrderStatus = 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseOrderItem {
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrderProps {
  tenantId: string;
  supplierId: string;
  destinationWarehouseId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate?: Date;
}

export class PurchaseOrderEntity extends AggregateRoot<PurchaseOrderProps> {
  get poNumber(): string { return this.props.poNumber; }
  get supplierId(): string { return this.props.supplierId; }
  get destinationWarehouseId(): string { return this.props.destinationWarehouseId; }
  get status(): PurchaseOrderStatus { return this.props.status; }
  get items(): PurchaseOrderItem[] { return this.props.items; }
  get totalAmount(): number { return this.props.totalAmount; }

  public approve(): void {
    if (this.props.status !== 'DRAFT') throw new Error(`Cannot approve PO in ${this.props.status} status`);
    this.props.status = 'APPROVED';
    this.touch();
  }

  public receiveItems(receivedQuantities: { variantId: string; qty: number }[]): void {
    if (this.props.status !== 'APPROVED' && this.props.status !== 'PARTIALLY_RECEIVED') {
      throw new Error(`Cannot receive goods on PO in ${this.props.status} status`);
    }

    let allFulfilled = true;
    for (const item of this.props.items) {
      const match = receivedQuantities.find(r => r.variantId === item.variantId);
      if (match) {
        item.receivedQty += match.qty;
      }
      if (item.receivedQty < item.orderedQty) {
        allFulfilled = false;
      }
    }

    this.props.status = allFulfilled ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
    this.touch();
  }
}

// ============================================================================
// 3. STOCK TRANSFERS DOMAIN
// ============================================================================
export type TransferStatus = 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';

export interface TransferItem {
  variantId: string;
  requestedQty: number;
  dispatchedQty: number;
  receivedQty: number;
}

export interface TransferProps {
  tenantId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: TransferStatus;
  items: TransferItem[];
}

export class StockTransferEntity extends AggregateRoot<TransferProps> {
  get transferNumber(): string { return this.props.transferNumber; }
  get sourceWarehouseId(): string { return this.props.sourceWarehouseId; }
  get destinationWarehouseId(): string { return this.props.destinationWarehouseId; }
  get status(): TransferStatus { return this.props.status; }
  get items(): TransferItem[] { return this.props.items; }

  public dispatch(): void {
    if (this.props.status !== 'DRAFT') throw new Error('Transfer can only be dispatched from DRAFT status');
    this.props.items.forEach(i => i.dispatchedQty = i.requestedQty);
    this.props.status = 'DISPATCHED';
    this.touch();
  }

  public receive(): void {
    if (this.props.status !== 'DISPATCHED') throw new Error('Transfer can only be received from DISPATCHED status');
    this.props.items.forEach(i => i.receivedQty = i.dispatchedQty);
    this.props.status = 'RECEIVED';
    this.touch();
  }
}
