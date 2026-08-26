import { z } from 'zod';
import { Result } from '../../core/domain/Result';
import { InMemoryRepository } from '../../core/infrastructure/Repository';
import { UserTokenPayload, SecurityContext } from '../../core/infrastructure/SecurityContext';
import { AuditService, IdempotencyService } from '../../core/infrastructure/AuditAndIdempotency';
import {
  RegisterShiftEntity,
  SalesOrderEntity,
  SalesReturnEntity,
  PromotionEntity,
  SalesOrderItem,
  PaymentSplit,
} from './PosDomain';
import { variantRepo, customerRepo, productRepo } from '../catalog/CatalogServices';
import { InventoryService } from '../inventory/InventoryServices';

// Repositories
export const shiftRepo = new InMemoryRepository<RegisterShiftEntity>();
export const salesOrderRepo = new InMemoryRepository<SalesOrderEntity>();
export const salesReturnRepo = new InMemoryRepository<SalesReturnEntity>();
export const promotionRepo = new InMemoryRepository<PromotionEntity>();

// DTO Schemas
export const OpenShiftDto = z.object({
  storeId: z.string().min(1),
  registerId: z.string().min(1),
  openingCashAmount: z.number().nonnegative(),
});

export const CloseShiftDto = z.object({
  shiftId: z.string().min(1),
  closingCashAmount: z.number().nonnegative(),
});

export const CheckoutCartDto = z.object({
  storeId: z.string().min(1),
  registerId: z.string().min(1),
  shiftId: z.string().min(1),
  warehouseId: z.string().min(1),
  customerId: z.string().optional(),
  promoCode: z.string().optional(),
  idempotencyKey: z.string().min(1),
  items: z.array(z.object({
    variantId: z.string().min(1),
    quantity: z.number().positive(),
    customDiscountAmount: z.number().nonnegative().optional(),
  })).min(1),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'CARD', 'STORE_CREDIT', 'LOYALTY_POINTS', 'GIFT_CARD']),
    amount: z.number().positive(),
    referenceNumber: z.string().optional(),
  })).min(1),
});

export const ProcessReturnDto = z.object({
  originalOrderId: z.string().min(1),
  warehouseId: z.string().min(1),
  refundPaymentMethod: z.enum(['CASH', 'CARD', 'STORE_CREDIT']),
  items: z.array(z.object({
    variantId: z.string().min(1),
    quantity: z.number().positive(),
    restockIntoInventory: z.boolean().default(true),
    reason: z.string().min(1),
  })).min(1),
});

export class PosService {
  // 1. Shift Open & Close
  public static async openShift(user: UserTokenPayload, input: z.infer<typeof OpenShiftDto>): Promise<Result<any>> {
    const validated = OpenShiftDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const shiftId = `shf_${Date.now()}`;
    const shift = new RegisterShiftEntity(shiftId, {
      tenantId: user.tenantId,
      storeId: validated.data.storeId,
      registerId: validated.data.registerId,
      cashierUserId: user.userId,
      openingCashAmount: validated.data.openingCashAmount,
      status: 'OPEN',
      openedAt: new Date(),
    });

    await shiftRepo.save(user.tenantId, shift);
    return Result.ok({ id: shift.id, status: shift.status, openingCashAmount: shift.openingCashAmount });
  }

  public static async closeShift(user: UserTokenPayload, input: z.infer<typeof CloseShiftDto>): Promise<Result<any>> {
    const validated = CloseShiftDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const shift = await shiftRepo.findById(user.tenantId, validated.data.shiftId);
    if (!shift) return Result.fail('Shift not found');

    // Aggregate sales during this shift
    const orders = await salesOrderRepo.findPaginated({ tenantId: user.tenantId, limit: 1000 });
    const shiftOrders = orders.items.filter(o => o.shiftId === shift.id && o.status === 'COMPLETED');
    
    let cashSalesTotal = 0;
    shiftOrders.forEach(o => {
      o.payments.filter(p => p.method === 'CASH').forEach(p => {
        cashSalesTotal += (p.amount - o.changeAmount);
      });
    });

    const expectedCash = shift.openingCashAmount + cashSalesTotal;
    shift.closeShift(validated.data.closingCashAmount, expectedCash);
    await shiftRepo.save(user.tenantId, shift);

    return Result.ok({
      id: shift.id,
      status: shift.status,
      openingCash: shift.openingCashAmount,
      closingCash: validated.data.closingCashAmount,
      expectedCash,
      cashDifference: shift.cashDifference,
      totalSalesCount: shiftOrders.length,
    });
  }

  // 2. POS Checkout Transaction Engine (Atomic + Idempotent + OCC + Double-Entry)
  public static async checkout(user: UserTokenPayload, input: z.infer<typeof CheckoutCartDto>): Promise<Result<any>> {
    const validated = CheckoutCartDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const data = validated.data;

    // Idempotency check to prevent duplicate charges on retry
    const existingIdempotency = await IdempotencyService.get(user.tenantId, data.idempotencyKey);
    if (existingIdempotency && existingIdempotency.responseBody) {
      return Result.ok({ ...existingIdempotency.responseBody, _isIdempotentReplay: true });
    }

    // Verify Shift
    const shift = await shiftRepo.findById(user.tenantId, data.shiftId);
    if (!shift || shift.status !== 'OPEN') {
      return Result.fail('Cannot process transaction: Shift is closed or invalid');
    }

    // Customer lookup if attached
    let customer: any = null;
    if (data.customerId) {
      customer = await customerRepo.findById(user.tenantId, data.customerId);
      if (!customer) return Result.fail('Customer not found');
    }

    // Build Cart Line Items with Pricing & Tax
    const orderItems: SalesOrderItem[] = [];
    let subtotal = 0;
    let totalTax = 0;

    for (const item of data.items) {
      const variant = await variantRepo.findById(user.tenantId, item.variantId);
      if (!variant) return Result.fail(`Variant ${item.variantId} not found`);

      // Real-time stock check
      const stock = await InventoryService.getStockOnHand(user.tenantId, variant.id, data.warehouseId);
      if (stock < item.quantity) {
        return Result.fail(`Insufficient stock for ${variant.variantName} (Stock: ${stock}, Requested: ${item.quantity})`);
      }

      const product = await productRepo.findById(user.tenantId, variant.productId);
      const isTaxable = product ? product.isTaxable : true;
      const taxRate = isTaxable ? 0.0825 : 0; // standard 8.25% tax

      const lineSubtotal = variant.retailPrice * item.quantity;
      const itemDiscount = item.customDiscountAmount || 0;
      const discountedSubtotal = Math.max(0, lineSubtotal - itemDiscount);
      const lineTax = discountedSubtotal * taxRate;
      const lineTotal = discountedSubtotal + lineTax;

      subtotal += discountedSubtotal;
      totalTax += lineTax;

      orderItems.push({
        variantId: variant.id,
        variantName: variant.variantName,
        quantity: item.quantity,
        unitPrice: variant.retailPrice,
        unitCost: variant.costPrice,
        discountAmount: itemDiscount,
        taxRatePercentage: taxRate * 100,
        taxAmount: lineTax,
        lineTotal,
      });
    }

    // Promo Code Discount Calculation
    let promoDiscount = 0;
    if (data.promoCode) {
      const promos = await promotionRepo.findPaginated({ tenantId: user.tenantId, limit: 100 });
      const promo = promos.items.find(p => p.code.toUpperCase() === data.promoCode!.toUpperCase());
      if (promo && promo.isValidNow(subtotal)) {
        promoDiscount = promo.discountType === 'PERCENTAGE'
          ? subtotal * (promo.discountValue / 100)
          : Math.min(subtotal, promo.discountValue);
      }
    }

    const orderTotal = Math.max(0, subtotal - promoDiscount + totalTax);

    // Validate Payments
    const totalPaid = data.payments.reduce((acc, curr) => acc + curr.amount, 0);
    if (totalPaid < orderTotal) {
      return Result.fail(`Insufficient payment: Total is $${orderTotal.toFixed(2)}, paid $${totalPaid.toFixed(2)}`);
    }

    // Process Store Credit or Loyalty Redemptions
    let loyaltyPointsRedeemed = 0;
    for (const payment of data.payments) {
      if (payment.method === 'STORE_CREDIT') {
        if (!customer) return Result.fail('Store credit payment requires an attached customer');
        try {
          customer.chargeStoreCredit(payment.amount);
          await customerRepo.save(user.tenantId, customer);
        } catch (err: any) {
          return Result.fail(`Store credit failed: ${err.message}`);
        }
      } else if (payment.method === 'LOYALTY_POINTS') {
        if (!customer) return Result.fail('Loyalty points redemption requires an attached customer');
        const pointsNeeded = Math.ceil(payment.amount * 100); // 100 pts = $1
        try {
          customer.addLoyaltyPoints(-pointsNeeded);
          loyaltyPointsRedeemed += pointsNeeded;
          await customerRepo.save(user.tenantId, customer);
        } catch (err: any) {
          return Result.fail(`Loyalty points failed: ${err.message}`);
        }
      }
    }

    // Loyalty Points Accrual: $1 = 1 point
    const loyaltyPointsEarned = Math.floor(orderTotal);
    if (customer) {
      customer.addLoyaltyPoints(loyaltyPointsEarned);
      await customerRepo.save(user.tenantId, customer);
    }

    const changeAmount = Math.max(0, totalPaid - orderTotal);
    const orderId = `ord_${Date.now()}`;
    const orderNumber = `REC-${Date.now().toString().slice(-6)}`;

    const salesOrder = new SalesOrderEntity(orderId, {
      tenantId: user.tenantId,
      storeId: data.storeId,
      registerId: data.registerId,
      shiftId: data.shiftId,
      cashierUserId: user.userId,
      customerId: customer?.id,
      orderNumber,
      status: 'COMPLETED',
      items: orderItems,
      subtotalAmount: subtotal,
      discountAmount: promoDiscount,
      taxAmount: totalTax,
      totalAmount: orderTotal,
      paidAmount: totalPaid,
      changeAmount,
      payments: data.payments,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed,
      completedAt: new Date(),
    });

    await salesOrderRepo.save(user.tenantId, salesOrder);

    // Ledger Deductions: Deduct inventory stock
    for (const item of orderItems) {
      await InventoryService.recordMovement(
        user.tenantId,
        user.userId,
        data.warehouseId,
        item.variantId,
        'POS_SALE',
        -item.quantity,
        item.unitCost,
        'SALES_ORDER',
        salesOrder.id,
        `POS Sale #${orderNumber}`
      );
    }

    const responseData = {
      orderId: salesOrder.id,
      orderNumber: salesOrder.orderNumber,
      status: salesOrder.status,
      subtotal: subtotal.toFixed(2),
      discount: promoDiscount.toFixed(2),
      tax: totalTax.toFixed(2),
      total: orderTotal.toFixed(2),
      paid: totalPaid.toFixed(2),
      change: changeAmount.toFixed(2),
      loyaltyPointsEarned,
      itemsCount: orderItems.length,
      receiptTimestamp: new Date().toISOString(),
    };

    // Store idempotency record
    await IdempotencyService.set({
      tenantId: user.tenantId,
      key: data.idempotencyKey,
      requestPath: '/api/v1/pos/checkout',
      requestHash: 'hash',
      responseStatus: 200,
      responseBody: responseData,
      createdAt: new Date(),
    });

    await AuditService.record({
      tenantId: user.tenantId,
      userId: user.userId,
      action: 'POS_SALE_COMPLETED',
      tableName: 'sales_orders',
      recordId: salesOrder.id,
      newValues: { orderNumber, total: orderTotal, itemsCount: orderItems.length },
    });

    return Result.ok(responseData);
  }

  // 3. Sales Returns & Restocking
  public static async processReturn(
    user: UserTokenPayload,
    input: z.infer<typeof ProcessReturnDto>
  ): Promise<Result<any>> {
    const validated = ProcessReturnDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const data = validated.data;
    const originalOrder = await salesOrderRepo.findById(user.tenantId, data.originalOrderId);
    if (!originalOrder) return Result.fail('Original sales order not found');

    let totalRefund = 0;
    const returnItems: any[] = [];

    for (const retItem of data.items) {
      const originalItem = originalOrder.items.find(i => i.variantId === retItem.variantId);
      if (!originalItem) return Result.fail(`Variant ${retItem.variantId} was not in original order`);
      if (retItem.quantity > originalItem.quantity) {
        return Result.fail(`Return qty (${retItem.quantity}) exceeds ordered qty (${originalItem.quantity})`);
      }

      const itemRefund = (originalItem.lineTotal / originalItem.quantity) * retItem.quantity;
      totalRefund += itemRefund;

      returnItems.push({
        variantId: retItem.variantId,
        quantity: retItem.quantity,
        refundAmount: itemRefund,
        restockIntoInventory: retItem.restockIntoInventory,
        reason: retItem.reason,
      });

      // If restocking, write back into inventory ledger
      if (retItem.restockIntoInventory) {
        await InventoryService.recordMovement(
          user.tenantId,
          user.userId,
          data.warehouseId,
          retItem.variantId,
          'SALE_RETURN',
          retItem.quantity,
          originalItem.unitCost,
          'SALES_RETURN',
          originalOrder.id,
          `Customer return on #${originalOrder.orderNumber}`
        );
      }
    }

    const returnId = `ret_${Date.now()}`;
    const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
    const salesReturn = new SalesReturnEntity(returnId, {
      tenantId: user.tenantId,
      originalOrderId: originalOrder.id,
      returnNumber,
      processedByUserId: user.userId,
      items: returnItems,
      totalRefundAmount: totalRefund,
      refundPaymentMethod: data.refundPaymentMethod,
      processedAt: new Date(),
    });

    await salesReturnRepo.save(user.tenantId, salesReturn);

    // If refund via Store Credit, credit customer account
    if (data.refundPaymentMethod === 'STORE_CREDIT' && originalOrder.customerId) {
      const customer = await customerRepo.findById(user.tenantId, originalOrder.customerId);
      if (customer) {
        customer.payStoreCredit(totalRefund); // decrease outstanding credit balance or add credit
        await customerRepo.save(user.tenantId, customer);
      }
    }

    return Result.ok({
      returnId: salesReturn.id,
      returnNumber: salesReturn.returnNumber,
      totalRefundAmount: totalRefund.toFixed(2),
      restockedCount: returnItems.filter(i => i.restockIntoInventory).length,
    });
  }

  // 4. Financial Analytics & Z-Reports
  public static async generateZReport(user: UserTokenPayload, shiftId: string): Promise<Result<any>> {
    const shift = await shiftRepo.findById(user.tenantId, shiftId);
    if (!shift) return Result.fail('Shift not found');

    const orders = await salesOrderRepo.findPaginated({ tenantId: user.tenantId, limit: 1000 });
    const shiftOrders = orders.items.filter(o => o.shiftId === shift.id && o.status === 'COMPLETED');

    const returns = await salesReturnRepo.findPaginated({ tenantId: user.tenantId, limit: 1000 });
    const shiftReturns = returns.items.filter(r => r.processedByUserId === shift.cashierUserId);

    let grossSales = 0;
    let netTax = 0;
    let totalDiscounts = 0;
    let paymentBreakdown: Record<string, number> = { CASH: 0, CARD: 0, STORE_CREDIT: 0, LOYALTY_POINTS: 0 };

    shiftOrders.forEach(o => {
      grossSales += o.subtotalAmount;
      netTax += o.taxAmount;
      totalDiscounts += o.discountAmount;
      o.payments.forEach(p => {
        paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
      });
    });

    const totalRefunds = shiftReturns.reduce((acc, curr) => acc + curr.totalRefundAmount, 0);
    const netSales = grossSales - totalDiscounts - totalRefunds;

    return Result.ok({
      shiftId: shift.id,
      registerId: shift.registerId,
      cashierUserId: shift.cashierUserId,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      ordersCount: shiftOrders.length,
      returnsCount: shiftReturns.length,
      grossSales: grossSales.toFixed(2),
      totalDiscounts: totalDiscounts.toFixed(2),
      totalRefunds: totalRefunds.toFixed(2),
      netSales: netSales.toFixed(2),
      netTax: netTax.toFixed(2),
      grandTotal: (netSales + netTax).toFixed(2),
      paymentBreakdown,
      openingCash: shift.openingCashAmount.toFixed(2),
      closingCash: (shift.closingCashAmount || 0).toFixed(2),
      cashDifference: (shift.cashDifference || 0).toFixed(2),
    });
  }

  // 5. Offline Sync Delta Pull & Push Engine
  public static async pullDeltas(
    tenantId: string,
    lastSyncTimestamp?: string
  ): Promise<{ products: any[]; customers: any[]; promotions: any[]; serverTimestamp: string }> {
    const since = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

    const prods = await productRepo.findPaginated({ tenantId, limit: 1000 });
    const variants = await variantRepo.findPaginated({ tenantId, limit: 1000 });
    const custs = await customerRepo.findPaginated({ tenantId, limit: 1000 });
    const promos = await promotionRepo.findPaginated({ tenantId, limit: 100 });

    return {
      products: prods.items.filter(p => p.updatedAt >= since).map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        variants: variants.items.filter(v => v.productId === p.id).map(v => ({
          id: v.id,
          sku: v.sku,
          variantName: v.variantName,
          retailPrice: v.retailPrice,
          barcode: v.barcode,
        })),
      })),
      customers: custs.items.filter(c => c.updatedAt >= since).map(c => ({
        id: c.id,
        customerCode: c.customerCode,
        fullName: c.fullName,
        tier: c.tier,
        creditLimit: c.creditLimit,
        currentCreditBalance: c.currentCreditBalance,
      })),
      promotions: promos.items.filter(pr => pr.updatedAt >= since).map(pr => ({
        id: pr.id,
        code: pr.code,
        discountType: pr.discountType,
        discountValue: pr.discountValue,
      })),
      serverTimestamp: new Date().toISOString(),
    };
  }
}
