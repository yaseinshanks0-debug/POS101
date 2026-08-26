import { LineItemInput, PricingContext, StepExplanation, QuantityBreakRule } from '../types';
import { MathPrecision } from './MathPrecision';

/**
 * Step 4: Quantity Break (Volume Tier) Resolution
 * Evaluates volume tiers based on line item purchase quantity.
 */
export function executeStep4_QuantityBreak(
  item: LineItemInput,
  currentUnitPrice: number,
  _context: PricingContext
): { unitPrice: number; subtotal: number; explanation: StepExplanation; matchedBreak?: QuantityBreakRule } {
  const breaks = item.quantityBreaks || [];
  const qty = item.quantity;

  // Find matching quantity tier
  const matchingBreaks = breaks.filter(qb => {
    if (qty < qb.minQuantity) return false;
    if (qb.maxQuantity !== undefined && qty > qb.maxQuantity) return false;
    return true;
  });

  if (matchingBreaks.length === 0) {
    const subtotal = MathPrecision.round(currentUnitPrice * qty, 2);
    return {
      unitPrice: currentUnitPrice,
      subtotal,
      explanation: {
        step: 'QUANTITY_BREAK',
        stepIndex: 4,
        inputUnitPrice: currentUnitPrice,
        outputUnitPrice: currentUnitPrice,
        inputSubtotal: subtotal,
        outputSubtotal: subtotal,
        adjustmentAmount: 0,
        status: 'SKIPPED',
        rationale: breaks.length > 0
          ? `Current quantity (${qty}) did not trigger volume breaks (Lowest threshold: ${Math.min(...breaks.map(b => b.minQuantity))}).`
          : 'No quantity break tiers configured for this item.'
      }
    };
  }

  // Pick the highest minQuantity matching break
  matchingBreaks.sort((a, b) => b.minQuantity - a.minQuantity);
  const matchedBreak = matchingBreaks[0];

  let calculatedUnitPrice = currentUnitPrice;
  switch (matchedBreak.breakType) {
    case 'TIERED_UNIT_PRICE':
      calculatedUnitPrice = MathPrecision.round(Math.max(0, matchedBreak.value), 4);
      break;
    case 'PERCENTAGE_DISCOUNT':
      calculatedUnitPrice = MathPrecision.applyPercentageDiscount(currentUnitPrice, matchedBreak.value);
      break;
    case 'AMOUNT_OFF_UNIT':
      calculatedUnitPrice = MathPrecision.clamp(currentUnitPrice - matchedBreak.value, 0);
      break;
  }

  const inputSubtotal = MathPrecision.round(currentUnitPrice * qty, 2);
  const outputSubtotal = MathPrecision.round(calculatedUnitPrice * qty, 2);
  const adjustmentAmount = MathPrecision.round(outputSubtotal - inputSubtotal, 2);

  const explanation: StepExplanation = {
    step: 'QUANTITY_BREAK',
    stepIndex: 4,
    inputUnitPrice: currentUnitPrice,
    outputUnitPrice: calculatedUnitPrice,
    inputSubtotal,
    outputSubtotal,
    adjustmentAmount,
    ruleId: matchedBreak.id,
    ruleApplied: matchedBreak.description || `Volume Tier ≥ ${matchedBreak.minQuantity}`,
    status: 'APPLIED',
    rationale: `Applied volume break for Qty ${qty} (Tier min: ${matchedBreak.minQuantity}${matchedBreak.maxQuantity ? ` - max: ${matchedBreak.maxQuantity}` : '+'}). Unit price: $${currentUnitPrice.toFixed(2)} → $${calculatedUnitPrice.toFixed(2)}.`
  };

  return {
    unitPrice: calculatedUnitPrice,
    subtotal: outputSubtotal,
    explanation,
    matchedBreak
  };
}
