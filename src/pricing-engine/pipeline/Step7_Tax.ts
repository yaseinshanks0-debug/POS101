import { LineItemInput, StepExplanation, TaxRule, TaxBreakdownDetail } from '../types';
import { MathPrecision } from './MathPrecision';

export interface TaxStepResult {
  taxType: 'INCLUSIVE' | 'EXCLUSIVE' | 'EXEMPT';
  totalTaxRatePercent: number;
  netSubtotal: number;
  taxAmount: number;
  grossLineTotal: number;
  taxBreakdowns: TaxBreakdownDetail[];
  explanation: StepExplanation;
}

/**
 * Step 7: Taxation Resolution
 * Computes Tax-Inclusive vs Tax-Exclusive amounts with multi-rate breakdowns and deterministic rounding.
 */
export function executeStep7_Tax(
  item: LineItemInput,
  netSubtotal: number
): TaxStepResult {
  const taxRule: TaxRule = item.taxRule || { taxType: 'EXCLUSIVE', rates: [] };

  if (taxRule.taxType === 'EXEMPT' || taxRule.rates.length === 0) {
    const explanation: StepExplanation = {
      step: 'TAX',
      stepIndex: 7,
      inputUnitPrice: netSubtotal / Math.max(1, item.quantity),
      outputUnitPrice: netSubtotal / Math.max(1, item.quantity),
      inputSubtotal: netSubtotal,
      outputSubtotal: netSubtotal,
      adjustmentAmount: 0,
      status: 'SKIPPED',
      rationale: taxRule.taxType === 'EXEMPT' ? 'Tax Exempt item category (0% tax).' : 'Zero tax rates applicable.'
    };

    return {
      taxType: 'EXEMPT',
      totalTaxRatePercent: 0,
      netSubtotal,
      taxAmount: 0,
      grossLineTotal: netSubtotal,
      taxBreakdowns: [],
      explanation
    };
  }

  // Aggregate standard & compound tax rates
  const standardRates = taxRule.rates.filter(r => !r.isCompound);
  const compoundRates = taxRule.rates.filter(r => r.isCompound);

  const totalStandardRate = standardRates.reduce((sum, r) => sum + r.rate, 0);

  if (taxRule.taxType === 'INCLUSIVE') {
    // 1. Tax-Inclusive: Reverse tax extraction
    const { netAmount, taxAmount: totalTaxAmount } = MathPrecision.extractInclusiveTax(netSubtotal, totalStandardRate);

    const breakdowns: TaxBreakdownDetail[] = standardRates.map(r => {
      const share = totalStandardRate > 0 ? (r.rate / totalStandardRate) : 0;
      const rateTax = MathPrecision.round(totalTaxAmount * share, 2);
      return {
        taxCode: r.code,
        name: r.name,
        ratePercent: r.rate,
        taxableAmount: netAmount,
        taxAmount: rateTax,
        isInclusive: true
      };
    });

    const explanation: StepExplanation = {
      step: 'TAX',
      stepIndex: 7,
      inputUnitPrice: netSubtotal / Math.max(1, item.quantity),
      outputUnitPrice: netSubtotal / Math.max(1, item.quantity),
      inputSubtotal: netSubtotal,
      outputSubtotal: netSubtotal,
      adjustmentAmount: 0,
      ruleApplied: `Tax-Inclusive (${totalStandardRate}%)`,
      status: 'APPLIED',
      rationale: `Extracted tax-inclusive total: Net $${netAmount.toFixed(2)} + Tax $${totalTaxAmount.toFixed(2)} = $${netSubtotal.toFixed(2)} total.`
    };

    return {
      taxType: 'INCLUSIVE',
      totalTaxRatePercent: totalStandardRate,
      netSubtotal: netAmount,
      taxAmount: totalTaxAmount,
      grossLineTotal: netSubtotal,
      taxBreakdowns: breakdowns,
      explanation
    };
  } else {
    // 2. Tax-Exclusive: Additive tax calculation
    let currentTaxable = netSubtotal;
    let totalTaxAmount = 0;
    const breakdowns: TaxBreakdownDetail[] = [];

    // Standard rates
    for (const r of standardRates) {
      const rateTax = MathPrecision.round(currentTaxable * (r.rate / 100), 2);
      totalTaxAmount = MathPrecision.round(totalTaxAmount + rateTax, 2);
      breakdowns.push({
        taxCode: r.code,
        name: r.name,
        ratePercent: r.rate,
        taxableAmount: currentTaxable,
        taxAmount: rateTax,
        isInclusive: false
      });
    }

    // Compound rates (taxes calculated on top of base + previous taxes)
    for (const r of compoundRates) {
      const compoundBase = MathPrecision.round(currentTaxable + totalTaxAmount, 2);
      const rateTax = MathPrecision.round(compoundBase * (r.rate / 100), 2);
      totalTaxAmount = MathPrecision.round(totalTaxAmount + rateTax, 2);
      breakdowns.push({
        taxCode: r.code,
        name: r.name,
        ratePercent: r.rate,
        taxableAmount: compoundBase,
        taxAmount: rateTax,
        isInclusive: false
      });
    }

    const grossTotal = MathPrecision.round(netSubtotal + totalTaxAmount, 2);
    const totalEffectiveRate = netSubtotal > 0 ? MathPrecision.round((totalTaxAmount / netSubtotal) * 100, 2) : 0;

    const explanation: StepExplanation = {
      step: 'TAX',
      stepIndex: 7,
      inputUnitPrice: netSubtotal / Math.max(1, item.quantity),
      outputUnitPrice: grossTotal / Math.max(1, item.quantity),
      inputSubtotal: netSubtotal,
      outputSubtotal: grossTotal,
      adjustmentAmount: totalTaxAmount,
      ruleApplied: `Tax-Exclusive (${totalEffectiveRate}%)`,
      status: 'APPLIED',
      rationale: `Calculated tax-exclusive additions: Subtotal $${netSubtotal.toFixed(2)} + Total Tax $${totalTaxAmount.toFixed(2)} = $${grossTotal.toFixed(2)}.`
    };

    return {
      taxType: 'EXCLUSIVE',
      totalTaxRatePercent: totalEffectiveRate,
      netSubtotal,
      taxAmount: totalTaxAmount,
      grossLineTotal: grossTotal,
      taxBreakdowns: breakdowns,
      explanation
    };
  }
}
