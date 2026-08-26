import { LineItemInput, PricingContext, StepExplanation, PromotionRule, PricingPolicyConfig } from '../types';
import { MathPrecision } from './MathPrecision';
import { DateScheduleMatcher } from './DateScheduleMatcher';
import { BuyXGetYCalculator } from './BuyXGetYCalculator';

export interface PromotionStepResult {
  unitPrice: number;
  subtotal: number;
  freeQuantity: number;
  paidQuantity: number;
  appliedPromotions: PromotionRule[];
  explanation: StepExplanation;
}

/**
 * Step 5: Promotional Pricing Resolution
 * Evaluates active promotions, Buy X Get Y campaigns, time-bounded flash sales, and discount caps.
 */
export function executeStep5_Promotion(
  item: LineItemInput,
  currentUnitPrice: number,
  promotions: PromotionRule[],
  context: PricingContext,
  policy: PricingPolicyConfig
): PromotionStepResult {
  const inputSubtotal = MathPrecision.round(currentUnitPrice * item.quantity, 2);

  // 1. Filter eligible promotions for this item & context
  const eligiblePromos = promotions.filter(promo => {
    // Schedule check (Deterministic)
    const schedule = DateScheduleMatcher.isScheduleActive(
      context.timestamp,
      promo.validFrom,
      promo.validTo,
      promo.allowedDaysOfWeek,
      promo.allowedTimeRange
    );
    if (!schedule.isActive) return false;

    // Store scope
    if (promo.storeIds && promo.storeIds.length > 0 && !promo.storeIds.includes(context.storeId)) {
      return false;
    }

    // Customer tier scope
    if (promo.customerTiers && promo.customerTiers.length > 0) {
      if (!context.customerTier || !promo.customerTiers.includes(context.customerTier)) {
        return false;
      }
    }

    // Product Variant or Category scope
    if (promo.productVariantIds && promo.productVariantIds.length > 0) {
      if (!promo.productVariantIds.includes(item.variantId)) return false;
    }
    if (promo.categoryIds && promo.categoryIds.length > 0) {
      const itemCats = item.categoryIds || [];
      const hasCat = promo.categoryIds.some(catId => itemCats.includes(catId));
      if (!hasCat) return false;
    }

    // Min Quantity check
    if (promo.minQuantity && item.quantity < promo.minQuantity) {
      return false;
    }

    // Min Subtotal check
    if (promo.minSubtotal && inputSubtotal < promo.minSubtotal) {
      return false;
    }

    return true;
  });

  if (eligiblePromos.length === 0) {
    return {
      unitPrice: currentUnitPrice,
      subtotal: inputSubtotal,
      freeQuantity: 0,
      paidQuantity: item.quantity,
      appliedPromotions: [],
      explanation: {
        step: 'PROMOTION',
        stepIndex: 5,
        inputUnitPrice: currentUnitPrice,
        outputUnitPrice: currentUnitPrice,
        inputSubtotal,
        outputSubtotal: inputSubtotal,
        adjustmentAmount: 0,
        status: 'SKIPPED',
        rationale: 'No eligible promotional campaigns or flash sales active for this line item.'
      }
    };
  }

  // 2. Evaluate promo outcome for each candidate
  interface EvaluatedPromo {
    promo: PromotionRule;
    unitPrice: number;
    subtotal: number;
    freeQty: number;
    paidQty: number;
    discountAmount: number;
    description: string;
  }

  const evaluated: EvaluatedPromo[] = eligiblePromos.map(promo => {
    let resultUnitPrice = currentUnitPrice;
    let resultSubtotal = inputSubtotal;
    let freeQty = 0;
    let paidQty = item.quantity;
    let discount = 0;
    let desc = promo.name;

    if (promo.type === 'BUY_X_GET_Y' && promo.buyXGetYConfig) {
      const bxgy = BuyXGetYCalculator.calculate(currentUnitPrice, item.quantity, promo.buyXGetYConfig);
      freeQty = bxgy.freeQuantity;
      paidQty = bxgy.paidQuantity;
      discount = bxgy.discountAmount;
      resultSubtotal = MathPrecision.round(inputSubtotal - discount, 2);
      resultUnitPrice = bxgy.effectiveUnitPrice;
      desc = `${promo.name} (${bxgy.explanation})`;
    } else if (promo.type === 'PROMO_UNIT_PRICE' && promo.value !== undefined) {
      resultUnitPrice = MathPrecision.round(Math.max(0, promo.value), 4);
      resultSubtotal = MathPrecision.round(resultUnitPrice * item.quantity, 2);
      discount = MathPrecision.round(inputSubtotal - resultSubtotal, 2);
    } else if (promo.type === 'PERCENTAGE_OFF' && promo.value !== undefined) {
      resultUnitPrice = MathPrecision.applyPercentageDiscount(currentUnitPrice, promo.value);
      resultSubtotal = MathPrecision.round(resultUnitPrice * item.quantity, 2);
      discount = MathPrecision.round(inputSubtotal - resultSubtotal, 2);
    } else if (promo.type === 'FIXED_AMOUNT_OFF' && promo.value !== undefined) {
      const totalAmountOff = MathPrecision.round(promo.value * item.quantity, 2);
      discount = totalAmountOff;
      resultSubtotal = MathPrecision.round(Math.max(0, inputSubtotal - totalAmountOff), 2);
      resultUnitPrice = item.quantity > 0 ? MathPrecision.round(resultSubtotal / item.quantity, 4) : 0;
    }

    // Apply promo maximum discount limit cap if configured
    if (promo.maxDiscountLimit && discount > promo.maxDiscountLimit) {
      const cappedDiscount = promo.maxDiscountLimit;
      resultSubtotal = MathPrecision.round(inputSubtotal - cappedDiscount, 2);
      resultUnitPrice = item.quantity > 0 ? MathPrecision.round(resultSubtotal / item.quantity, 4) : 0;
      discount = cappedDiscount;
      desc += ` [Capped at max limit $${promo.maxDiscountLimit.toFixed(2)}]`;
    }

    return {
      promo,
      unitPrice: resultUnitPrice,
      subtotal: resultSubtotal,
      freeQty,
      paidQty,
      discountAmount: discount,
      description: desc
    };
  });

  // 3. Conflict Resolution Strategy
  // If stacking is NOT allowed or single promo chosen:
  let selected = evaluated[0];

  if (policy.conflictResolutionStrategy === 'LOWEST_PRICE') {
    // Best deal for customer (highest discount)
    evaluated.sort((a, b) => b.discountAmount - a.discountAmount || (b.promo.priority - a.promo.priority));
    selected = evaluated[0];
  } else if (policy.conflictResolutionStrategy === 'HIGHEST_PRIORITY') {
    evaluated.sort((a, b) => b.promo.priority - a.promo.priority || (b.discountAmount - a.discountAmount));
    selected = evaluated[0];
  }

  const adjustmentAmount = MathPrecision.round(selected.subtotal - inputSubtotal, 2);

  const explanation: StepExplanation = {
    step: 'PROMOTION',
    stepIndex: 5,
    inputUnitPrice: currentUnitPrice,
    outputUnitPrice: selected.unitPrice,
    inputSubtotal,
    outputSubtotal: selected.subtotal,
    adjustmentAmount,
    ruleId: selected.promo.id,
    ruleApplied: selected.promo.name,
    status: 'APPLIED',
    rationale: `Applied promotion "${selected.promo.name}": Saved $${selected.discountAmount.toFixed(2)}. ${selected.description}`
  };

  return {
    unitPrice: selected.unitPrice,
    subtotal: selected.subtotal,
    freeQuantity: selected.freeQty,
    paidQuantity: selected.paidQty,
    appliedPromotions: [selected.promo],
    explanation
  };
}
