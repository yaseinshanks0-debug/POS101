import { LineItemInput, PricingContext, StepExplanation, StoreOverride } from '../types';
import { MathPrecision } from './MathPrecision';
import { DateScheduleMatcher } from './DateScheduleMatcher';

/**
 * Step 2: Store Override Resolution
 * Checks if the store has a location-specific price override active at context timestamp.
 */
export function executeStep2_StoreOverride(
  item: LineItemInput,
  currentUnitPrice: number,
  context: PricingContext
): { unitPrice: number; subtotal: number; explanation: StepExplanation; matchedOverride?: StoreOverride } {
  const overrides = item.storeOverrides || [];
  const activeOverrides = overrides.filter(override => {
    if (override.storeId !== context.storeId) return false;
    const schedule = DateScheduleMatcher.isScheduleActive(
      context.timestamp,
      override.validFrom,
      override.validTo
    );
    return schedule.isActive;
  });

  if (activeOverrides.length === 0) {
    const subtotal = MathPrecision.round(currentUnitPrice * item.quantity, 2);
    return {
      unitPrice: currentUnitPrice,
      subtotal,
      explanation: {
        step: 'STORE_OVERRIDE',
        stepIndex: 2,
        inputUnitPrice: currentUnitPrice,
        outputUnitPrice: currentUnitPrice,
        inputSubtotal: subtotal,
        outputSubtotal: subtotal,
        adjustmentAmount: 0,
        status: 'SKIPPED',
        rationale: `No active store-specific price override found for Store "${context.storeId}". Kept price at $${currentUnitPrice.toFixed(2)}.`
      }
    };
  }

  // Sort by priority descending, then lowest price
  activeOverrides.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const matchedOverride = activeOverrides[0];
  const overridePrice = MathPrecision.round(Math.max(0, matchedOverride.overridePrice), 4);
  const inputSubtotal = MathPrecision.round(currentUnitPrice * item.quantity, 2);
  const outputSubtotal = MathPrecision.round(overridePrice * item.quantity, 2);
  const adjustmentAmount = MathPrecision.round(outputSubtotal - inputSubtotal, 2);

  const explanation: StepExplanation = {
    step: 'STORE_OVERRIDE',
    stepIndex: 2,
    inputUnitPrice: currentUnitPrice,
    outputUnitPrice: overridePrice,
    inputSubtotal,
    outputSubtotal,
    adjustmentAmount,
    ruleId: matchedOverride.id,
    ruleApplied: `Store Override [${context.storeId}]`,
    status: 'APPLIED',
    rationale: `Applied store override for Store "${context.storeId}": $${currentUnitPrice.toFixed(2)} → $${overridePrice.toFixed(2)} (${matchedOverride.reason || 'Location Pricing'}).`
  };

  return {
    unitPrice: overridePrice,
    subtotal: outputSubtotal,
    explanation,
    matchedOverride
  };
}
