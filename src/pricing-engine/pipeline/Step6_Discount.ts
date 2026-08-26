import { LineItemInput, StepExplanation, PricingPolicyConfig } from '../types';
import { MathPrecision } from './MathPrecision';

/**
 * Step 6: Line-Item Discount & Margin Protection Resolution
 * Evaluates manual cashier discounts, coupons, and enforces floor price / maximum discount caps.
 */
export function executeStep6_Discount(
  item: LineItemInput,
  currentUnitPrice: number,
  policy: PricingPolicyConfig
): { unitPrice: number; subtotal: number; discountAmount: number; explanation: StepExplanation } {
  const inputSubtotal = MathPrecision.round(currentUnitPrice * item.quantity, 2);
  const manualDisc = item.manualDiscount;

  if (!manualDisc || manualDisc.value <= 0) {
    return {
      unitPrice: currentUnitPrice,
      subtotal: inputSubtotal,
      discountAmount: 0,
      explanation: {
        step: 'DISCOUNT',
        stepIndex: 6,
        inputUnitPrice: currentUnitPrice,
        outputUnitPrice: currentUnitPrice,
        inputSubtotal,
        outputSubtotal: inputSubtotal,
        adjustmentAmount: 0,
        status: 'SKIPPED',
        rationale: 'No manual line-item discount or coupon code applied to this item.'
      }
    };
  }

  // 1. Calculate raw discount
  let calculatedUnitPrice = currentUnitPrice;
  let rawDiscountValue = 0;

  if (manualDisc.type === 'PERCENTAGE') {
    // Check global percentage cap
    let effectivePct = manualDisc.value;
    if (policy.maxDiscountPercentageCap && effectivePct > policy.maxDiscountPercentageCap) {
      effectivePct = policy.maxDiscountPercentageCap;
    }
    calculatedUnitPrice = MathPrecision.applyPercentageDiscount(currentUnitPrice, effectivePct);
    rawDiscountValue = MathPrecision.round(currentUnitPrice - calculatedUnitPrice, 4);
  } else if (manualDisc.type === 'FIXED') {
    calculatedUnitPrice = MathPrecision.clamp(currentUnitPrice - manualDisc.value, 0);
    rawDiscountValue = MathPrecision.round(currentUnitPrice - calculatedUnitPrice, 4);
  }

  // 2. Floor Price & Cost Margin Protection
  let status: 'APPLIED' | 'FLOOR_CAPPED' = 'APPLIED';
  let floorRationale = '';
  const floorPrice = item.minFloorPrice !== undefined ? item.minFloorPrice : item.costPrice;

  if (policy.enforceFloorPrice && floorPrice > 0 && calculatedUnitPrice < floorPrice) {
    calculatedUnitPrice = floorPrice;
    status = 'FLOOR_CAPPED';
    floorRationale = ` [PROTECTED: Price clamped to floor/cost limit of $${floorPrice.toFixed(2)}]`;
  }

  const outputSubtotal = MathPrecision.round(calculatedUnitPrice * item.quantity, 2);
  const adjustmentAmount = MathPrecision.round(outputSubtotal - inputSubtotal, 2);
  const discountAmount = MathPrecision.round(Math.abs(adjustmentAmount), 2);

  const explanation: StepExplanation = {
    step: 'DISCOUNT',
    stepIndex: 6,
    inputUnitPrice: currentUnitPrice,
    outputUnitPrice: calculatedUnitPrice,
    inputSubtotal,
    outputSubtotal,
    adjustmentAmount,
    ruleApplied: `Manual ${manualDisc.type} Discount (${manualDisc.value}${manualDisc.type === 'PERCENTAGE' ? '%' : '$'})`,
    status,
    rationale: `Applied line discount (${manualDisc.reason || 'Cashier Override'}): Unit price $${currentUnitPrice.toFixed(2)} → $${calculatedUnitPrice.toFixed(2)}${floorRationale}.`
  };

  return {
    unitPrice: calculatedUnitPrice,
    subtotal: outputSubtotal,
    discountAmount,
    explanation
  };
}
