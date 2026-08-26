import { z } from 'zod';
import { Result } from '../../core/domain/Result';
import { InMemoryRepository } from '../../core/infrastructure/Repository';
import { UserTokenPayload, SecurityContext } from '../../core/infrastructure/SecurityContext';
import { AuditService } from '../../core/infrastructure/AuditAndIdempotency';
import {
  InventoryLedgerEntity,
  PurchaseOrderEntity,
  StockTransferEntity,
  StockMovementType,
} from './InventoryDomain';

// Repositories
export const inventoryLedgerRepo = new InMemoryRepository<InventoryLedgerEntity>();
export const purchaseOrderRepo = new InMemoryRepository<PurchaseOrderEntity>();
export const stockTransferRepo = new InMemoryRepository<StockTransferEntity>();

// DTOs
export const CreatePurchaseOrderDto = z.object({
  supplierId: z.string().min(1),
  destinationWarehouseId: z.string().min(1),
  poNumber: z.string().min(1),
  items: z.array(z.object({
    variantId: z.string().min(1),
    orderedQty: z.number().positive(),
    unitCost: z.number().nonnegative(),
  })).min(1),
});

export const ReceiveGoodsDto = z.object({
  purchaseOrderId: z.string().min(1),
  items: z.array(z.object({
    variantId: z.string().min(1),
    qty: z.number().positive(),
  })).min(1),
});

export const CreateStockTransferDto = z.object({
  transferNumber: z.string().min(1),
  sourceWarehouseId: z.string().min(1),
  destinationWarehouseId: z.string().min(1),
  items: z.array(z.object({
    variantId: z.string().min(1),
    requestedQty: z.number().positive(),
  })).min(1),
});

export class InventoryService {
  // Append a Double-Entry Ledger Movement (Core stock modification mechanism)
  public static async recordMovement(
    tenantId: string,
    userId: string,
    warehouseId: string,
    variantId: string,
    movementType: StockMovementType,
    quantityDelta: number,
    unitCost: number,
    refType: string,
    refId: string,
    notes?: string
  ): Promise<InventoryLedgerEntity> {
    const entryId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledger = new InventoryLedgerEntity(entryId, {
      tenantId,
      warehouseId,
      variantId,
      createdByUserId: userId,
      movementType,
      quantityDelta,
      unitCost,
      referenceDocumentType: refType,
      referenceDocumentId: refId,
      notes,
      occurredAt: new Date(),
    });
    await inventoryLedgerRepo.save(tenantId, ledger);
    return ledger;
  }

  // Calculate Real-time Stock on Hand via Ledger Aggregation
  public static async getStockOnHand(
    tenantId: string,
    variantId: string,
    warehouseId?: string
  ): Promise<number> {
    const result = await inventoryLedgerRepo.findPaginated({ tenantId, limit: 10000 });
    const relevantMovements = result.items.filter(
      item => item.variantId === variantId && (!warehouseId || item.warehouseId === warehouseId)
    );
    return relevantMovements.reduce((acc, curr) => acc + curr.quantityDelta, 0);
  }

  // Purchasing Workflow: Create PO -> Approve PO -> Receive Goods (GRN)
  public static async createPurchaseOrder(
    user: UserTokenPayload,
    input: z.infer<typeof CreatePurchaseOrderDto>
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(user, 'purchasing:create')) {
      return Result.fail('Forbidden: Missing purchasing:create permission');
    }

    const validated = CreatePurchaseOrderDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const data = validated.data;
    const poId = `po_${Date.now()}`;
    const items = data.items.map(i => ({
      ...i,
      receivedQty: 0,
      lineTotal: i.orderedQty * i.unitCost,
    }));
    const totalAmount = items.reduce((acc, curr) => acc + curr.lineTotal, 0);

    const po = new PurchaseOrderEntity(poId, {
      tenantId: user.tenantId,
      supplierId: data.supplierId,
      destinationWarehouseId: data.destinationWarehouseId,
      poNumber: data.poNumber,
      status: 'DRAFT',
      items,
      totalAmount,
    });

    await purchaseOrderRepo.save(user.tenantId, po);
    return Result.ok({ id: po.id, poNumber: po.poNumber, status: po.status, totalAmount: po.totalAmount });
  }

  public static async approvePurchaseOrder(
    user: UserTokenPayload,
    poId: string
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(user, 'purchasing:approve')) {
      return Result.fail('Forbidden: Missing purchasing:approve permission');
    }

    const po = await purchaseOrderRepo.findById(user.tenantId, poId);
    if (!po) return Result.fail('Purchase order not found');

    po.approve();
    await purchaseOrderRepo.save(user.tenantId, po);
    return Result.ok({ id: po.id, status: po.status });
  }

  public static async receiveGoods(
    user: UserTokenPayload,
    input: z.infer<typeof ReceiveGoodsDto>
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(user, 'purchasing:receive')) {
      return Result.fail('Forbidden: Missing purchasing:receive permission');
    }

    const validated = ReceiveGoodsDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const po = await purchaseOrderRepo.findById(user.tenantId, validated.data.purchaseOrderId);
    if (!po) return Result.fail('Purchase order not found');

    po.receiveItems(validated.data.items);
    await purchaseOrderRepo.save(user.tenantId, po);

    // Write double-entry stock receipts into inventory ledger
    for (const item of validated.data.items) {
      const poItem = po.items.find(i => i.variantId === item.variantId);
      const unitCost = poItem ? poItem.unitCost : 0;
      await this.recordMovement(
        user.tenantId,
        user.userId,
        po.destinationWarehouseId,
        item.variantId,
        'PURCHASE_RECEIPT',
        item.qty,
        unitCost,
        'PURCHASE_ORDER',
        po.id,
        `Goods received against PO ${po.poNumber}`
      );
    }

    await AuditService.record({
      tenantId: user.tenantId,
      userId: user.userId,
      action: 'GOODS_RECEIVED',
      tableName: 'purchase_orders',
      recordId: po.id,
      newValues: { receivedItems: validated.data.items },
    });

    return Result.ok({ id: po.id, status: po.status, message: 'Stock received into warehouse ledger successfully' });
  }

  // Stock Transfer Workflow: Create -> Dispatch (Stock Out) -> Receive (Stock In)
  public static async createStockTransfer(
    user: UserTokenPayload,
    input: z.infer<typeof CreateStockTransferDto>
  ): Promise<Result<any>> {
    const validated = CreateStockTransferDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const data = validated.data;
    const transferId = `trf_${Date.now()}`;
    const transfer = new StockTransferEntity(transferId, {
      tenantId: user.tenantId,
      transferNumber: data.transferNumber,
      sourceWarehouseId: data.sourceWarehouseId,
      destinationWarehouseId: data.destinationWarehouseId,
      status: 'DRAFT',
      items: data.items.map(i => ({
        variantId: i.variantId,
        requestedQty: i.requestedQty,
        dispatchedQty: 0,
        receivedQty: 0,
      })),
    });

    await stockTransferRepo.save(user.tenantId, transfer);
    return Result.ok({ id: transfer.id, transferNumber: transfer.transferNumber, status: transfer.status });
  }

  public static async dispatchTransfer(user: UserTokenPayload, transferId: string): Promise<Result<any>> {
    const transfer = await stockTransferRepo.findById(user.tenantId, transferId);
    if (!transfer) return Result.fail('Transfer not found');

    // Check stock availability in source warehouse
    for (const item of transfer.items) {
      const stock = await this.getStockOnHand(user.tenantId, item.variantId, transfer.sourceWarehouseId);
      if (stock < item.requestedQty) {
        return Result.fail(`Insufficient stock for variant ${item.variantId} in source warehouse (Available: ${stock}, Requested: ${item.requestedQty})`);
      }
    }

    transfer.dispatch();
    await stockTransferRepo.save(user.tenantId, transfer);

    // Ledger: Stock Out from source warehouse
    for (const item of transfer.items) {
      await this.recordMovement(
        user.tenantId,
        user.userId,
        transfer.sourceWarehouseId,
        item.variantId,
        'TRANSFER_OUT',
        -item.dispatchedQty,
        0,
        'STOCK_TRANSFER',
        transfer.id,
        `Dispatched in transit transfer ${transfer.transferNumber}`
      );
    }

    return Result.ok({ id: transfer.id, status: transfer.status });
  }

  public static async receiveTransfer(user: UserTokenPayload, transferId: string): Promise<Result<any>> {
    const transfer = await stockTransferRepo.findById(user.tenantId, transferId);
    if (!transfer) return Result.fail('Transfer not found');

    transfer.receive();
    await stockTransferRepo.save(user.tenantId, transfer);

    // Ledger: Stock In to destination warehouse
    for (const item of transfer.items) {
      await this.recordMovement(
        user.tenantId,
        user.userId,
        transfer.destinationWarehouseId,
        item.variantId,
        'TRANSFER_IN',
        item.receivedQty,
        0,
        'STOCK_TRANSFER',
        transfer.id,
        `Received transfer ${transfer.transferNumber}`
      );
    }

    return Result.ok({ id: transfer.id, status: transfer.status });
  }
}
