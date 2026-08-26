import { SpecSection } from '../types';

export const domainModelSection: SpecSection = {
  id: 'domain-model',
  number: 3,
  title: 'Domain Model Specification',
  shortTitle: '3. Domain Model',
  badge: 'Domain-Driven Design',
  summary: 'Comprehensive Domain-Driven Design (DDD) domain model specifying Ubiquitous Language, Aggregate Roots, Entities, Value Objects, Domain Invariants, and Domain Events.',
  subsections: [
    {
      id: 'domain-ubiquitous-language',
      title: '3.1 Ubiquitous Language & Core Terminology',
      content: `A unified domain vocabulary shared across engineers, store managers, and domain experts:`,
      tables: [
        {
          headers: ['Term', 'Domain Meaning & Semantic Boundary'],
          rows: [
            ['Tenant', 'The top-level business organization account owning all stores, inventory, and users.'],
            ['Store / Branch', 'A physical retail location with distinct inventory warehouses and staff.'],
            ['Register / Terminal', 'A specific POS hardware workstation bound to a designated store and cash drawer.'],
            ['Product & Variant', 'A parent catalog item (e.g., "T-Shirt") and its specific purchasable SKUs (e.g., "T-Shirt - Red / Large").'],
            ['Unit of Measure (UOM)', 'The quantitative unit of counting (e.g., Piece, Kilogram, Box). Each product has exactly one Base UOM.'],
            ['Unit Conversion', 'A deterministic mathematical multiplier between a packaging UOM and the Base UOM (e.g., 1 Box = 12 Pieces).'],
            ['Stock Movement Ledger', 'An append-only, immutable journal of all inventory increases and decreases. Stock balance is the sum of ledger entries.'],
            ['Purchase Order (PO)', 'A formal procurement agreement sent to a supplier specifying products, quantities, and agreed cost prices.'],
            ['Goods Received Note (GRN)', 'The physical intake record confirming received quantities from a PO, updating inventory and calculating landed costs.'],
            ['Sales Order', 'A finalized commercial transaction representing goods sold, taxes applied, and split tenders accepted.'],
            ['Layaway / Held Cart', 'A pending sales order temporarily parked in memory or local storage without decrementing committed inventory.'],
            ['Shift / Register Session', 'A bounded cashier shift period starting with an opening cash float declaration and ending with a Z-Report closure.']
          ]
        }
      ]
    },
    {
      id: 'domain-aggregates',
      title: '3.2 Aggregate Roots & Entity Relationships',
      content: `The system defines 6 core Aggregate Roots with strict transactional boundaries:

1. **SalesOrder Aggregate**:
   - **Root**: \`SalesOrder\`
   - **Internal Entities**: \`SalesOrderItem\`, \`SalesOrderTaxLine\`, \`SalesOrderPayment\`, \`SalesOrderDiscount\`
   - **Value Objects**: \`Money\`, \`Quantity\`, \`TaxBreakdown\`, \`DiscountSpecification\`
   - **Boundary Invariants**: Total payments must equal or exceed order total; total tax is the sum of tax lines; items cannot have negative unit prices.

2. **InventoryItem Aggregate**:
   - **Root**: \`InventoryItem\` (Scoped to \`StoreId\` + \`ProductVariantId\`)
   - **Internal Entities**: \`StockBatch\`, \`SerialNumberRecord\`
   - **Value Objects**: \`ReorderThresholds\`, \`StorageLocation\`
   - **Boundary Invariants**: Available stock = (On Hand - Allocated / Reserved); On Hand cannot be negative unless \`allowNegativeStock\` policy is active.

3. **ProductCatalog Aggregate**:
   - **Root**: \`Product\`
   - **Internal Entities**: \`ProductVariant\`, \`ProductBarcode\`, \`PackagingUnit\`
   - **Value Objects**: \`SKU\`, \`BarcodeValue\`, \`ConversionFactor\`
   - **Boundary Invariants**: SKU must be unique across tenant; every barcode must be globally unique across all active variants.

4. **PurchaseOrder Aggregate**:
   - **Root**: \`PurchaseOrder\`
   - **Internal Entities**: \`PurchaseOrderItem\`
   - **Value Objects**: \`SupplierTerms\`, \`LandedCostBreakdown\`
   - **Boundary Invariants**: Received quantity cannot exceed ordered quantity + permissible tolerance buffer; cannot edit a closed/completed PO.

5. **CustomerAccount Aggregate**:
   - **Root**: \`Customer\`
   - **Internal Entities**: \`StoreCreditAccount\`, \`LoyaltyBalance\`
   - **Value Objects**: \`CreditLimit\`, \`TaxExemptNumber\`
   - **Boundary Invariants**: Total outstanding credit balance cannot exceed \`creditLimit\`.

6. **RegisterShift Aggregate**:
   - **Root**: \`RegisterShift\`
   - **Internal Entities**: \`CashMovement\` (Pay-in / Pay-out), \`TenderReconciliation\`
   - **Value Objects**: \`CashFloat\`, \`VarianceAmount\`
   - **Boundary Invariants**: A register terminal cannot have more than one open shift concurrently.`,
      codeSnippets: [
        {
          language: 'typescript',
          filename: 'sales-order.aggregate.ts',
          code: `export class SalesOrder extends AggregateRoot {
  private _status: SalesOrderStatus;
  private _items: SalesOrderItem[] = [];
  private _payments: SalesOrderPayment[] = [];
  private _discounts: SalesOrderDiscount[] = [];
  private _taxes: SalesOrderTaxLine[] = [];

  constructor(
    readonly id: OrderId,
    readonly tenantId: TenantId,
    readonly storeId: StoreId,
    readonly registerId: RegisterId,
    readonly cashierId: UserId,
    readonly customerId: CustomerId | null,
    readonly orderNumber: string,
    readonly createdAt: Date
  ) {
    super();
    this._status = SalesOrderStatus.DRAFT;
  }

  addItem(variant: ProductVariant, uom: UnitOfMeasure, quantity: number, unitPrice: Money): void {
    if (this._status !== SalesOrderStatus.DRAFT) throw new DomainException('Cannot modify non-draft order');
    if (quantity <= 0) throw new DomainException('Quantity must be greater than zero');
    
    const existing = this._items.find(i => i.variantId.equals(variant.id) && i.uomId.equals(uom.id));
    if (existing) {
      existing.increaseQuantity(quantity);
    } else {
      this._items.push(new SalesOrderItem(OrderItemId.generate(), variant.id, uom.id, quantity, unitPrice));
    }
    this.recalculateTotals();
  }

  addPayment(tenderType: TenderType, amount: Money, reference?: string): void {
    if (this._status !== SalesOrderStatus.DRAFT) throw new DomainException('Cannot pay non-draft order');
    this._payments.push(new SalesOrderPayment(PaymentId.generate(), tenderType, amount, reference, new Date()));
    
    if (this.totalPaid.isGreaterThanOrEqualTo(this.grandTotal)) {
      this._status = SalesOrderStatus.COMPLETED;
      this.addDomainEvent(new SaleCompletedEvent(this.id, this.tenantId, this.storeId, this._items, this._payments));
    }
  }
}`
        }
      ]
    },
    {
      id: 'domain-invariants',
      title: '3.3 Core Domain Invariants & Business Rules',
      content: `The domain enforces non-negotiable enterprise constraints:

1. **Stock Non-Negativity Invariant**:
   - Physical stock cannot drop below zero unless the store explicitly enables the \`ALLOW_NEGATIVE_STOCK\` feature flag (e.g. for high-speed checkout where goods physically exist before intake paperwork is logged).
2. **Immutable Stock Movement Journal**:
   - Inventory quantities are never directly updated via \`UPDATE inventory SET quantity = 10\`. Instead, stock is calculated as the projection of immutable journal events (\`StockMovementRecordedEvent\`).
3. **Deterministic Pricing Pipeline**:
   - The price of a line item follows a rigid evaluation sequence:
     $$\\text{Final Price} = (\\text{Base Price} \\times \\text{UOM Ratio} \\rightarrow \\text{Qty Break} \\rightarrow \\text{Customer Tier} \\rightarrow \\text{Promos} \\rightarrow \\text{Manual Discount}) + \\text{Taxes}$$
4. **Idempotent Synchronization**:
   - Every offline mutation bears a unique client-generated UUIDv7 and an \`idempotencyKey\` hash. Duplicate transmissions yield the cached server result without side-effects.
5. **Fiscal Shift Integrity**:
   - No sale can be processed on a register without an active, open shift session.`
    },
    {
      id: 'domain-events',
      title: '3.4 Domain Events Catalog',
      content: `Domain events emitted across aggregates to drive eventual consistency and side-effects:`,
      tables: [
        {
          headers: ['Event Name', 'Aggregate Source', 'Key Payload Attributes', 'Triggered Reactions / Side-Effects'],
          rows: [
            ['SaleCompletedEvent', 'SalesOrder', 'orderId, storeId, items, payments, total', 'Generates StockMovements, logs financial ledger, updates customer loyalty points, emits fiscal receipt'],
            ['StockMovementRecordedEvent', 'InventoryItem', 'movementId, storeId, variantId, qty, type, reason', 'Updates store inventory snapshot, triggers low-stock reorder alert if below threshold'],
            ['GoodsReceivedEvent', 'PurchaseOrder', 'grnId, poId, storeId, receivedItems, landedCosts', 'Appends positive stock movements, updates Moving Average Cost (WAC), marks PO status'],
            ['StockTransferDispatchedEvent', 'StockTransfer', 'transferId, fromStoreId, toStoreId, items', 'Moves stock from source store to "In-Transit" virtual warehouse'],
            ['CustomerCreditAdjustedEvent', 'CustomerAccount', 'customerId, deltaAmount, reason, referenceId', 'Updates customer credit balance, appends immutable store credit journal entry'],
            ['ShiftClosedEvent', 'RegisterShift', 'shiftId, registerId, declaredCash, expectedCash, variance', 'Generates Z-Report, archives shift transaction batch, notifies store manager of variance']
          ]
        }
      ]
    }
  ]
};
