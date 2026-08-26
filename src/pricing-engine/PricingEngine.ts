import {
  CartPricingInput,
  CartPricingResult,
  LineItemInput,
  LineItemPricingResult,
  PricingContext,
  PricingPolicyConfig,
  PromotionRule,
  TaxBreakdownDetail
} from './types';
import { MathPrecision } from './pipeline/MathPrecision';
import { executeStep1_BasePrice } from './pipeline/Step1_BasePrice';
import { executeStep2_StoreOverride } from './pipeline/Step2_StoreOverride';
import { executeStep3_CustomerPrice } from './pipeline/Step3_CustomerPrice';
import { executeStep4_QuantityBreak } from './pipeline/Step4_QuantityBreak';
import { executeStep5_Promotion } from './pipeline/Step5_Promotion';
import { executeStep6_Discount } from './pipeline/Step6_Discount';
import { executeStep7_Tax } from './pipeline/Step7_Tax';
import { executeStep8_FinalPrice } from './pipeline/Step8_FinalPrice';

export const DEFAULT_PRICING_POLICY: PricingPolicyConfig = {
  conflictResolutionStrategy: 'LOWEST_PRICE',
  allowStackingPromotions: false,
  enforceFloorPrice: true,
  maxDiscountPercentageCap: 80,
  roundingMode: 'HALF_UP',
  orderDiscountAllocation: 'PROPORTIONAL_BY_VALUE'
};

/**
 * Deterministic Retail Pricing & Taxation Engine
 * 
 * Pipeline:
 * 1. Base Price
 * 2. Store Override
 * 3. Customer Price
 * 4. Quantity Break
 * 5. Promotion (including BXGY)
 * 6. Discount & Floor Protection
 * 7. Tax (Inclusive/Exclusive)
 * 8. Final Price & Reconciliation
 */
export class PricingEngine {
  public static readonly VERSION = '2.4.0-deterministic';

  /**
   * Evaluates a single line item through all 8 pipeline steps deterministically.
   */
  public static calculateLineItem(
    item: LineItemInput,
    promotions: PromotionRule[],
    context: PricingContext,
    policyConfig?: Partial<PricingPolicyConfig>
  ): LineItemPricingResult {
    const policy: PricingPolicyConfig = { ...DEFAULT_PRICING_POLICY, ...policyConfig };
    const explanations = [];

    // STEP 1: Base Price
    const step1 = executeStep1_BasePrice(item, context);
    explanations.push(step1.explanation);
    let currentPrice = step1.unitPrice;

    // STEP 2: Store Override
    const step2 = executeStep2_StoreOverride(item, currentPrice, context);
    explanations.push(step2.explanation);
    currentPrice = step2.unitPrice;

    // STEP 3: Customer Price
    const step3 = executeStep3_CustomerPrice(item, currentPrice, context);
    explanations.push(step3.explanation);
    currentPrice = step3.unitPrice;

    // STEP 4: Quantity Break
    const step4 = executeStep4_QuantityBreak(item, currentPrice, context);
    explanations.push(step4.explanation);
    currentPrice = step4.unitPrice;

    // STEP 5: Promotion (Time-bounded, BXGY, Flash Sales)
    const step5 = executeStep5_Promotion(item, currentPrice, promotions, context, policy);
    explanations.push(step5.explanation);
    currentPrice = step5.unitPrice;

    // STEP 6: Line Discount & Floor/Margin Limit Protection
    const step6 = executeStep6_Discount(item, currentPrice, policy);
    explanations.push(step6.explanation);
    currentPrice = step6.unitPrice;

    const netSubtotal = step6.subtotal;
    const grossSubtotal = MathPrecision.round(step1.unitPrice * item.quantity, 2);
    const totalLineDiscount = MathPrecision.round(Math.max(0, grossSubtotal - netSubtotal), 2);

    // STEP 7: Tax Resolution
    const step7 = executeStep7_Tax(item, netSubtotal);
    explanations.push(step7.explanation);

    // STEP 8: Final Price
    const step8 = executeStep8_FinalPrice(item, step7.grossLineTotal, step1.unitPrice);
    explanations.push(step8.explanation);

    return {
      lineId: item.lineId,
      variantId: item.variantId,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      baseUnitPrice: step1.unitPrice,
      storeOverrideUnitPrice: step2.unitPrice,
      customerUnitPrice: step3.unitPrice,
      quantityBreakUnitPrice: step4.unitPrice,
      promoUnitPrice: step5.unitPrice,
      manualDiscountUnitPrice: step6.unitPrice,
      netUnitPrice: currentPrice,
      taxInclusiveUnitPrice: step7.taxType === 'INCLUSIVE' ? currentPrice : MathPrecision.round(step8.effectiveUnitRate, 4),
      grossSubtotal,
      netSubtotal,
      totalLineDiscount,
      allocatedOrderDiscount: 0,
      effectiveSubtotal: netSubtotal,
      freeQuantity: step5.freeQuantity,
      paidQuantity: step5.paidQuantity,
      taxType: step7.taxType,
      taxRatePercent: step7.totalTaxRatePercent,
      taxAmount: step7.taxAmount,
      finalLineTotal: step8.finalTotal,
      effectiveUnitRate: step8.effectiveUnitRate,
      explanations
    };
  }

  /**
   * Evaluates an entire cart/ticket deterministically, including proportional order discounts.
   */
  public static calculateCart(input: CartPricingInput): CartPricingResult {
    const policy: PricingPolicyConfig = { ...DEFAULT_PRICING_POLICY, ...input.policies };
    const auditTrail: string[] = [];

    auditTrail.push(`[${input.context.timestamp}] Initialized Deterministic Pricing Engine v${PricingEngine.VERSION}`);
    auditTrail.push(`Context: Store="${input.context.storeId}", Customer="${input.context.customerId || 'GUEST'}", Tier="${input.context.customerTier || 'STANDARD'}"`);

    // 1. Calculate each line item individually
    const evaluatedItems: LineItemPricingResult[] = input.items.map(item => {
      const result = PricingEngine.calculateLineItem(item, input.promotions, input.context, policy);
      auditTrail.push(`Item "${item.sku}" x${item.quantity}: Base $${result.baseUnitPrice.toFixed(2)} → Net $${result.netUnitPrice.toFixed(2)} (Savings: $${result.totalLineDiscount.toFixed(2)})`);
      return result;
    });

    // 2. Aggregate Gross & Net Subtotals
    const grossSubtotal = MathPrecision.round(evaluatedItems.reduce((sum, item) => sum + item.grossSubtotal, 0), 2);
    let netSubtotal = MathPrecision.round(evaluatedItems.reduce((sum, item) => sum + item.netSubtotal, 0), 2);
    const totalLineDiscounts = MathPrecision.round(evaluatedItems.reduce((sum, item) => sum + item.totalLineDiscount, 0), 2);

    // 3. Proportional Order Discount Allocation
    let orderDiscountAmount = 0;
    if (input.orderDiscount && input.orderDiscount.value > 0 && netSubtotal > 0) {
      if (input.orderDiscount.type === 'PERCENTAGE') {
        const pct = MathPrecision.clamp(input.orderDiscount.value, 0, 100);
        orderDiscountAmount = MathPrecision.round(netSubtotal * (pct / 100), 2);
      } else if (input.orderDiscount.type === 'FIXED') {
        orderDiscountAmount = MathPrecision.clamp(input.orderDiscount.value, 0, netSubtotal);
      }

      auditTrail.push(`Allocating Order Discount: $${orderDiscountAmount.toFixed(2)} (${input.orderDiscount.type})`);

      // Allocate proportionally across line items
      let allocatedSoFar = 0;
      evaluatedItems.forEach((item, index) => {
        if (index === evaluatedItems.length - 1) {
          // Remainder assignment to avoid 1-cent rounding drift
          item.allocatedOrderDiscount = MathPrecision.round(orderDiscountAmount - allocatedSoFar, 2);
        } else {
          const itemShare = netSubtotal > 0 ? (item.netSubtotal / netSubtotal) : 0;
          const lineAllocation = MathPrecision.round(orderDiscountAmount * itemShare, 2);
          item.allocatedOrderDiscount = lineAllocation;
          allocatedSoFar += lineAllocation;
        }
        item.effectiveSubtotal = MathPrecision.round(item.netSubtotal - item.allocatedOrderDiscount, 2);
      });

      netSubtotal = MathPrecision.round(netSubtotal - orderDiscountAmount, 2);
    }

    // 4. Tax aggregation
    const taxMap = new Map<string, TaxBreakdownDetail>();
    let totalTax = 0;

    evaluatedItems.forEach(item => {
      // Find matching item input to get tax rules
      const inputItem = input.items.find(i => i.lineId === item.lineId);
      if (inputItem && inputItem.taxRule) {
        // Re-evaluate tax with order discount applied
        const taxResult = executeStep7_Tax(inputItem, item.effectiveSubtotal);
        item.taxAmount = taxResult.taxAmount;
        item.finalLineTotal = taxResult.grossLineTotal;
        item.effectiveUnitRate = item.quantity > 0 ? MathPrecision.round(item.finalLineTotal / item.quantity, 4) : 0;

        taxResult.taxBreakdowns.forEach(tb => {
          const existing = taxMap.get(tb.taxCode);
          if (existing) {
            existing.taxableAmount = MathPrecision.round(existing.taxableAmount + tb.taxableAmount, 2);
            existing.taxAmount = MathPrecision.round(existing.taxAmount + tb.taxAmount, 2);
          } else {
            taxMap.set(tb.taxCode, { ...tb });
          }
        });

        totalTax = MathPrecision.round(totalTax + taxResult.taxAmount, 2);
      }
    });

    const taxBreakdown: TaxBreakdownDetail[] = Array.from(taxMap.values());

    // 5. Grand Total calculation
    // If tax is exclusive, grandTotal = netSubtotal + totalTax. If tax inclusive, grandTotal = gross of inclusive items + exclusive items.
    const grandTotal = MathPrecision.round(
      evaluatedItems.reduce((sum, item) => sum + item.finalLineTotal, 0),
      2
    );

    const totalSavings = MathPrecision.round(totalLineDiscounts + orderDiscountAmount, 2);
    const effectiveSavingsPercentage = grossSubtotal > 0
      ? MathPrecision.round((totalSavings / grossSubtotal) * 100, 2)
      : 0;

    // Analytics: Cost & Margin
    const totalCost = MathPrecision.round(
      input.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0),
      2
    );
    const grossMarginAmount = MathPrecision.round(netSubtotal - totalCost, 2);
    const grossMarginPercentage = netSubtotal > 0
      ? MathPrecision.round((grossMarginAmount / netSubtotal) * 100, 2)
      : 0;

    auditTrail.push(`Settlement: Gross $${grossSubtotal.toFixed(2)} - Savings $${totalSavings.toFixed(2)} + Tax $${totalTax.toFixed(2)} = Grand Total $${grandTotal.toFixed(2)}`);

    return {
      items: evaluatedItems,
      currency: input.context.currency || 'USD',
      grossSubtotal,
      totalLineDiscounts,
      orderDiscountAmount,
      totalSavings,
      netSubtotal,
      totalTax,
      taxBreakdown,
      grandTotal,
      effectiveSavingsPercentage,
      totalCost,
      grossMarginAmount,
      grossMarginPercentage,
      evaluationTimestamp: input.context.timestamp,
      engineVersion: PricingEngine.VERSION,
      isDeterministic: true,
      auditTrail
    };
  }
}
