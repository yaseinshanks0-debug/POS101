import { LineItemInput, PricingContext, StepExplanation } from '../types';
import { MathPrecision } from './MathPrecision';

/**
 * Step 1: Base Price Resolution
 * Validates and establishes the standard catalog base price for the line item.
 */
export function executeStep1_BasePrice(
  item: LineItemInput,
  _context: PricingContext
): { unitPrice: number; subtotal: number; explanation: StepExplanation } {
  const basePrice = MathPrecision.round(Math.max(0, item.basePrice), 4);
  const subtotal = MathPrecision.round(basePrice * item.quantity, 2);

  const explanation: StepExplanation = {
    step: 'BASE_PRICE',
    stepIndex: 1,
    inputUnitPrice: basePrice,
    outputUnitPrice: basePrice,
    inputSubtotal: subtotal,
    outputSubtotal: subtotal,
    adjustmentAmount: 0,
    status: 'APPLIED',
    rationale: `Established base catalog retail price at $${basePrice.toFixed(2)} per unit for ${item.quantity} unit(s).`
  };

  return { unitPrice: basePrice, subtotal, explanation };
}
