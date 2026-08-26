import { LineItemInput, StepExplanation } from '../types';
import { MathPrecision } from './MathPrecision';

/**
 * Step 8: Final Price Resolution
 * Assembles final line totals, computes effective per-unit realization rates, and seals audit trail.
 */
export function executeStep8_FinalPrice(
  item: LineItemInput,
  finalLineTotal: number,
  baseUnitPrice: number
): { finalTotal: number; effectiveUnitRate: number; totalSavings: number; explanation: StepExplanation } {
  const finalTotal = MathPrecision.round(finalLineTotal, 2);
  const effectiveUnitRate = item.quantity > 0 ? MathPrecision.round(finalTotal / item.quantity, 4) : 0;
  const originalCatalogTotal = MathPrecision.round(baseUnitPrice * item.quantity, 2);
  const totalSavings = MathPrecision.round(Math.max(0, originalCatalogTotal - finalTotal), 2);

  const explanation: StepExplanation = {
    step: 'FINAL_PRICE',
    stepIndex: 8,
    inputUnitPrice: effectiveUnitRate,
    outputUnitPrice: effectiveUnitRate,
    inputSubtotal: finalTotal,
    outputSubtotal: finalTotal,
    adjustmentAmount: 0,
    status: 'APPLIED',
    rationale: `Final line settlement: $${finalTotal.toFixed(2)} ($${effectiveUnitRate.toFixed(2)}/unit for ${item.quantity} qty). Total customer savings: $${totalSavings.toFixed(2)}.`
  };

  return {
    finalTotal,
    effectiveUnitRate,
    totalSavings,
    explanation
  };
}
