import { BuyXGetYConfig } from '../types';
import { MathPrecision } from './MathPrecision';

export interface BuyXGetYResult {
  paidQuantity: number;
  freeQuantity: number;
  discountAmount: number;
  effectiveUnitPrice: number;
  appliedSets: number;
  explanation: string;
}

/**
 * Deterministic Calculator for Buy X Get Y (BXGY) promotions.
 * Example: Buy 2 Get 1 Free (buyQuantity = 2, getQuantity = 1, discountPercentage = 100).
 * Group size = 2 + 1 = 3.
 * For quantity 5:
 *   Full sets = floor(5 / 3) = 1 set (3 items: 2 paid, 1 free).
 *   Remainder = 2 items (both paid).
 *   Total paid = 4, Total free = 1.
 */
export class BuyXGetYCalculator {
  public static calculate(
    unitPrice: number,
    quantity: number,
    config: BuyXGetYConfig
  ): BuyXGetYResult {
    const buyQty = Math.max(1, config.buyQuantity);
    const getQty = Math.max(1, config.getQuantity);
    const discountPct = MathPrecision.clamp(config.discountPercentage, 0, 100);

    const setSize = buyQty + getQty;
    const maxSets = config.maxRewardApplications || Infinity;

    // Determine how many complete sets qualify
    const possibleSets = Math.floor(quantity / setSize);
    const actualSets = Math.min(possibleSets, maxSets);

    const freeItems = actualSets * getQty;
    const paidItems = quantity - freeItems;

    // Calculate total discount from reward items
    const rewardItemDiscount = MathPrecision.round(unitPrice * (discountPct / 100), 4);
    const totalDiscount = MathPrecision.round(freeItems * rewardItemDiscount, 2);

    const grossTotal = MathPrecision.round(unitPrice * quantity, 2);
    const netTotal = MathPrecision.round(grossTotal - totalDiscount, 2);
    const effectiveUnitPrice = quantity > 0 ? MathPrecision.round(netTotal / quantity, 4) : unitPrice;

    return {
      paidQuantity: paidItems,
      freeQuantity: freeItems,
      discountAmount: totalDiscount,
      effectiveUnitPrice,
      appliedSets: actualSets,
      explanation: actualSets > 0
        ? `Applied Buy ${buyQty} Get ${getQty} (${discountPct}% off): ${actualSets} set(s) matched. ${freeItems} reward item(s) saved $${totalDiscount.toFixed(2)}.`
        : `Quantity ${quantity} did not satisfy minimum set requirement (${setSize} items for Buy ${buyQty} Get ${getQty}).`
    };
  }
}
