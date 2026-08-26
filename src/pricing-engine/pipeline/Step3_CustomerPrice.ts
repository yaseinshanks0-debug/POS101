import { LineItemInput, PricingContext, StepExplanation, CustomerPriceRule } from '../types';
import { MathPrecision } from './MathPrecision';
import { DateScheduleMatcher } from './DateScheduleMatcher';

/**
 * Step 3: Customer Price Resolution
 * Resolves customer-specific contract prices or customer loyalty tier discounts.
 */
export function executeStep3_CustomerPrice(
  item: LineItemInput,
  currentUnitPrice: number,
  context: PricingContext
): { unitPrice: number; subtotal: number; explanation: StepExplanation; matchedRule?: CustomerPriceRule } {
  const rules = item.customerPriceRules || [];

  // Filter rules by matching customer ID or customer Tier
  const applicableRules = rules.filter(rule => {
    let matchesTarget = false;
    if (rule.customerId && context.customerId && rule.customerId === context.customerId) {
      matchesTarget = true;
    }
    if (rule.customerTier && context.customerTier && rule.customerTier === context.customerTier) {
      matchesTarget = true;
    }
    if (!matchesTarget) return false;

    const schedule = DateScheduleMatcher.isScheduleActive(
      context.timestamp,
      rule.validFrom,
      rule.validTo
    );
    return schedule.isActive;
  });

  if (applicableRules.length === 0) {
    const subtotal = MathPrecision.round(currentUnitPrice * item.quantity, 2);
    return {
      unitPrice: currentUnitPrice,
      subtotal,
      explanation: {
        step: 'CUSTOMER_PRICE',
        stepIndex: 3,
        inputUnitPrice: currentUnitPrice,
        outputUnitPrice: currentUnitPrice,
        inputSubtotal: subtotal,
        outputSubtotal: subtotal,
        adjustmentAmount: 0,
        status: 'SKIPPED',
        rationale: context.customerId || context.customerTier
          ? `No special customer price agreement found for customer "${context.customerId || context.customerTier}".`
          : 'Standard guest checkout (No customer ID or tier provided).'
      }
    };
  }

  // Prioritize customerId specific contracts over generic customerTier rules, then priority field
  applicableRules.sort((a, b) => {
    const aIsDirect = a.customerId === context.customerId ? 10 : 0;
    const bIsDirect = b.customerId === context.customerId ? 10 : 0;
    const aPriority = (a.priority || 0) + aIsDirect;
    const bPriority = (b.priority || 0) + bIsDirect;
    return bPriority - aPriority;
  });

  const matchedRule = applicableRules[0];
  let calculatedUnitPrice = currentUnitPrice;

  switch (matchedRule.type) {
    case 'FIXED_PRICE':
      calculatedUnitPrice = MathPrecision.round(Math.max(0, matchedRule.value), 4);
      break;
    case 'PERCENTAGE_DISCOUNT':
      calculatedUnitPrice = MathPrecision.applyPercentageDiscount(currentUnitPrice, matchedRule.value);
      break;
    case 'AMOUNT_OFF':
      calculatedUnitPrice = MathPrecision.clamp(currentUnitPrice - matchedRule.value, 0);
      break;
  }

  const inputSubtotal = MathPrecision.round(currentUnitPrice * item.quantity, 2);
  const outputSubtotal = MathPrecision.round(calculatedUnitPrice * item.quantity, 2);
  const adjustmentAmount = MathPrecision.round(outputSubtotal - inputSubtotal, 2);

  const explanation: StepExplanation = {
    step: 'CUSTOMER_PRICE',
    stepIndex: 3,
    inputUnitPrice: currentUnitPrice,
    outputUnitPrice: calculatedUnitPrice,
    inputSubtotal,
    outputSubtotal,
    adjustmentAmount,
    ruleId: matchedRule.id,
    ruleApplied: matchedRule.contractId ? `Contract ${matchedRule.contractId}` : `Tier ${matchedRule.customerTier || 'Custom'}`,
    status: 'APPLIED',
    rationale: `Applied customer pricing (${matchedRule.type} = ${matchedRule.value}): $${currentUnitPrice.toFixed(2)} → $${calculatedUnitPrice.toFixed(2)} per unit.`
  };

  return {
    unitPrice: calculatedUnitPrice,
    subtotal: outputSubtotal,
    explanation,
    matchedRule
  };
}
