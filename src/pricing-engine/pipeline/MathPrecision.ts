import { RoundingMode } from '../types';

/**
 * Deterministic Fixed-Precision Arithmetic Engine.
 * Standardizes all monetary calculations to 4 decimal places internally,
 * and rounds to 2 decimal places for financial ledger entries.
 */
export class MathPrecision {
  /**
   * Rounds a number according to the specified rounding policy and decimal places.
   * Default: 2 decimal places with HALF_UP (Standard financial rounding).
   */
  public static round(value: number, decimals: number = 2, mode: RoundingMode = 'HALF_UP'): number {
    if (isNaN(value) || !isFinite(value)) return 0;

    const factor = Math.pow(10, decimals);
    const scaled = value * factor;

    switch (mode) {
      case 'HALF_UP': {
        // Standard arithmetic rounding: 0.5 rounds away from zero
        const sign = value >= 0 ? 1 : -1;
        const absScaled = Math.abs(scaled);
        const rounded = Math.floor(absScaled + 0.5 + Number.EPSILON);
        return (sign * rounded) / factor;
      }

      case 'HALF_EVEN': {
        // Banker's Rounding: 0.5 rounds to nearest even integer
        const floor = Math.floor(scaled);
        const diff = scaled - floor;
        if (Math.abs(diff - 0.5) < Number.EPSILON) {
          return (floor % 2 === 0 ? floor : floor + 1) / factor;
        }
        return Math.round(scaled) / factor;
      }

      case 'CEIL':
        return Math.ceil(scaled) / factor;

      case 'FLOOR':
        return Math.floor(scaled) / factor;

      default:
        return Math.round(scaled) / factor;
    }
  }

  /**
   * Safe clamped subtraction ensuring values do not drop below zero or floor price.
   */
  public static clamp(value: number, min: number = 0, max?: number): number {
    let result = Math.max(min, value);
    if (max !== undefined) {
      result = Math.min(max, result);
    }
    return MathPrecision.round(result, 4);
  }

  /**
   * Calculates percentage discount: price * (1 - pct / 100)
   */
  public static applyPercentageDiscount(price: number, percentage: number): number {
    const validPct = MathPrecision.clamp(percentage, 0, 100);
    const discounted = price * (1 - validPct / 100);
    return MathPrecision.round(discounted, 4);
  }

  /**
   * Calculates reverse tax (for tax-inclusive pricing):
   * Tax Amount = Total - (Total / (1 + Rate / 100))
   */
  public static extractInclusiveTax(grossTotal: number, taxRatePercent: number): { netAmount: number; taxAmount: number } {
    if (taxRatePercent <= 0) {
      return { netAmount: grossTotal, taxAmount: 0 };
    }
    const rateFactor = 1 + (taxRatePercent / 100);
    const netAmount = MathPrecision.round(grossTotal / rateFactor, 2);
    const taxAmount = MathPrecision.round(grossTotal - netAmount, 2);
    return { netAmount, taxAmount };
  }

  /**
   * Calculates additive tax (for tax-exclusive pricing):
   * Tax Amount = Net * (Rate / 100)
   */
  public static calculateExclusiveTax(netTotal: number, taxRatePercent: number): { taxAmount: number; grossAmount: number } {
    if (taxRatePercent <= 0) {
      return { taxAmount: 0, grossAmount: netTotal };
    }
    const taxAmount = MathPrecision.round(netTotal * (taxRatePercent / 100), 2);
    const grossAmount = MathPrecision.round(netTotal + taxAmount, 2);
    return { taxAmount, grossAmount };
  }
}
