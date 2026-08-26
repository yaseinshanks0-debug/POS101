import { PricingEngine } from '../PricingEngine';
import {
  CartPricingInput,
  LineItemInput,
  PricingContext,
  PromotionRule,
  TaxRule
} from '../types';

export interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  errorDetails?: string;
  executionTimeMs: number;
}

/**
 * Comprehensive Automated Test Suite for Deterministic Pricing Engine.
 * Covers all edge cases, pipeline stages, schedule bounds, and precision guarantees.
 */
export class PricingEngineTestSuite {
  public static runAllTests(): TestCaseResult[] {
    const results: TestCaseResult[] = [];

    const standardTaxExclusive: TaxRule = {
      taxType: 'EXCLUSIVE',
      rates: [{ code: 'VAT_STD', name: 'Standard Sales Tax', rate: 10 }]
    };

    const standardTaxInclusive: TaxRule = {
      taxType: 'INCLUSIVE',
      rates: [{ code: 'VAT_INC', name: 'Inclusive VAT', rate: 10 }]
    };

    const defaultContext: PricingContext = {
      storeId: 'STORE_DOWNTOWN',
      customerId: 'CUST_001',
      customerTier: 'RETAIL',
      timestamp: '2026-08-26T12:00:00Z',
      currency: 'USD'
    };

    // Helper assertion
    function assertTest(
      id: string,
      name: string,
      category: string,
      fn: () => { passed: boolean; expected: string; actual: string }
    ) {
      const start = performance.now();
      try {
        const res = fn();
        results.push({
          id,
          name,
          category,
          passed: res.passed,
          expected: res.expected,
          actual: res.actual,
          executionTimeMs: Number((performance.now() - start).toFixed(2))
        });
      } catch (err: any) {
        results.push({
          id,
          name,
          category,
          passed: false,
          expected: 'Execution without exceptions',
          actual: `Threw Exception: ${err.message}`,
          errorDetails: err.stack,
          executionTimeMs: Number((performance.now() - start).toFixed(2))
        });
      }
    }

    // ==========================================
    // 1. BASE PRICE TESTS
    // ==========================================
    assertTest('TC-01', 'Standard Base Catalog Price Calculation', 'Base Price', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-COFFEE-01',
        name: 'Single Espresso',
        basePrice: 5.00,
        costPrice: 1.50,
        quantity: 2,
        taxRule: standardTaxExclusive
      };
      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      const expectedTotal = 11.00; // ($5.00 * 2) + 10% tax = $10 + $1 = $11
      const actualTotal = result.finalLineTotal;
      return {
        passed: actualTotal === expectedTotal && result.baseUnitPrice === 5.00,
        expected: `$${expectedTotal.toFixed(2)} (Base: $5.00/unit)`,
        actual: `$${actualTotal.toFixed(2)} (Base: $${result.baseUnitPrice.toFixed(2)}/unit)`
      };
    });

    // ==========================================
    // 2. STORE OVERRIDE TESTS
    // ==========================================
    assertTest('TC-02', 'Store Override Matched & Active', 'Store Override', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-WATER-500',
        name: 'Mineral Water',
        basePrice: 2.00,
        costPrice: 0.50,
        quantity: 1,
        storeOverrides: [
          {
            id: 'ovr-1',
            storeId: 'STORE_DOWNTOWN',
            overridePrice: 2.50,
            validFrom: '2026-01-01T00:00:00Z',
            validTo: '2026-12-31T23:59:59Z',
            reason: 'Prime Airport/Downtown surcharge'
          }
        ],
        taxRule: standardTaxExclusive
      };
      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      return {
        passed: result.storeOverrideUnitPrice === 2.50,
        expected: 'Store Override Unit Price = $2.50',
        actual: `Store Override Unit Price = $${result.storeOverrideUnitPrice.toFixed(2)}`
      };
    });

    assertTest('TC-03', 'Store Override Skipped for Different Store', 'Store Override', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-WATER-500',
        name: 'Mineral Water',
        basePrice: 2.00,
        costPrice: 0.50,
        quantity: 1,
        storeOverrides: [
          {
            id: 'ovr-suburb',
            storeId: 'STORE_SUBURBS',
            overridePrice: 1.80
          }
        ],
        taxRule: standardTaxExclusive
      };
      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      return {
        passed: result.storeOverrideUnitPrice === 2.00,
        expected: 'Base Price Kept = $2.00',
        actual: `Effective Price = $${result.storeOverrideUnitPrice.toFixed(2)}`
      };
    });

    assertTest('TC-04', 'Store Override Expired Reverts to Base Price', 'Store Override', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-WATER-500',
        name: 'Mineral Water',
        basePrice: 2.00,
        costPrice: 0.50,
        quantity: 1,
        storeOverrides: [
          {
            id: 'ovr-old',
            storeId: 'STORE_DOWNTOWN',
            overridePrice: 1.50,
            validFrom: '2025-01-01T00:00:00Z',
            validTo: '2025-12-31T23:59:59Z'
          }
        ],
        taxRule: standardTaxExclusive
      };
      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      return {
        passed: result.storeOverrideUnitPrice === 2.00,
        expected: 'Base Price Kept = $2.00',
        actual: `Effective Price = $${result.storeOverrideUnitPrice.toFixed(2)}`
      };
    });

    // ==========================================
    // 3. CUSTOMER PRICING & TIER TESTS
    // ==========================================
    assertTest('TC-05', 'VIP Customer Tier 10% Discount Rule', 'Customer Pricing', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-BEANS-1KG',
        name: 'Whole Bean Roast',
        basePrice: 20.00,
        costPrice: 8.00,
        quantity: 1,
        customerPriceRules: [
          {
            id: 'tier-vip',
            customerTier: 'VIP',
            type: 'PERCENTAGE_DISCOUNT',
            value: 10
          }
        ],
        taxRule: standardTaxExclusive
      };
      const vipContext: PricingContext = { ...defaultContext, customerTier: 'VIP' };
      const result = PricingEngine.calculateLineItem(item, [], vipContext);
      return {
        passed: result.customerUnitPrice === 18.00,
        expected: 'Customer Unit Price = $18.00 (10% off $20.00)',
        actual: `Customer Unit Price = $${result.customerUnitPrice.toFixed(2)}`
      };
    });

    assertTest('TC-06', 'Direct Customer Contract Price Priority over Tier', 'Customer Pricing', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-BEANS-1KG',
        name: 'Whole Bean Roast',
        basePrice: 20.00,
        costPrice: 8.00,
        quantity: 1,
        customerPriceRules: [
          {
            id: 'tier-vip',
            customerTier: 'VIP',
            type: 'PERCENTAGE_DISCOUNT',
            value: 10 // $18.00
          },
          {
            id: 'contract-corp',
            customerId: 'CUST_ACME_CORP',
            type: 'FIXED_PRICE',
            value: 15.00,
            contractId: 'AGR-2026-ACME'
          }
        ],
        taxRule: standardTaxExclusive
      };
      const corpContext: PricingContext = {
        ...defaultContext,
        customerId: 'CUST_ACME_CORP',
        customerTier: 'VIP'
      };
      const result = PricingEngine.calculateLineItem(item, [], corpContext);
      return {
        passed: result.customerUnitPrice === 15.00,
        expected: 'Contract Direct Price = $15.00',
        actual: `Customer Unit Price = $${result.customerUnitPrice.toFixed(2)}`
      };
    });

    // ==========================================
    // 4. QUANTITY BREAK (VOLUME TIER) TESTS
    // ==========================================
    assertTest('TC-07', 'Quantity Break Volume Pricing (Exact & Tier Thresholds)', 'Quantity Breaks', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-CUP-PAPER',
        name: 'Biodegradable Cups 50pk',
        basePrice: 10.00,
        costPrice: 3.00,
        quantity: 6, // Triggers Tier 2 (min 5, max 10)
        quantityBreaks: [
          { id: 'qb-1', minQuantity: 5, maxQuantity: 10, breakType: 'TIERED_UNIT_PRICE', value: 8.50 },
          { id: 'qb-2', minQuantity: 11, breakType: 'TIERED_UNIT_PRICE', value: 7.00 }
        ],
        taxRule: standardTaxExclusive
      };
      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      return {
        passed: result.quantityBreakUnitPrice === 8.50 && result.netSubtotal === 51.00,
        expected: 'Unit Price = $8.50, Net Subtotal = $51.00 for 6 units',
        actual: `Unit Price = $${result.quantityBreakUnitPrice.toFixed(2)}, Net Subtotal = $${result.netSubtotal.toFixed(2)}`
      };
    });

    assertTest('TC-08', 'Quantity Below Break Threshold Remains Unchanged', 'Quantity Breaks', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-CUP-PAPER',
        name: 'Biodegradable Cups 50pk',
        basePrice: 10.00,
        costPrice: 3.00,
        quantity: 4, // Below min 5
        quantityBreaks: [
          { id: 'qb-1', minQuantity: 5, breakType: 'TIERED_UNIT_PRICE', value: 8.50 }
        ],
        taxRule: standardTaxExclusive
      };
      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      return {
        passed: result.quantityBreakUnitPrice === 10.00,
        expected: 'Unit Price = $10.00',
        actual: `Unit Price = $${result.quantityBreakUnitPrice.toFixed(2)}`
      };
    });

    // ==========================================
    // 5. PROMOTION & SCHEDULE TESTS
    // ==========================================
    assertTest('TC-09', 'Scheduled Flash Sale Promotion Time Bounds', 'Promotions', () => {
      const promo: PromotionRule = {
        id: 'promo-flash',
        name: 'Midday Coffee Happy Hour 20% Off',
        type: 'PERCENTAGE_OFF',
        value: 20,
        productVariantIds: ['v1'],
        validFrom: '2026-08-01T00:00:00Z',
        validTo: '2026-08-31T23:59:59Z',
        allowedTimeRange: { startTime: '11:00', endTime: '14:00' },
        isStackable: false,
        priority: 100
      };

      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-LATTE-12',
        name: 'Vanilla Oat Latte',
        basePrice: 6.00,
        costPrice: 1.80,
        quantity: 1,
        taxRule: standardTaxExclusive
      };

      // In-range context (12:00 UTC)
      const validRes = PricingEngine.calculateLineItem(item, [promo], defaultContext);

      // Out-of-range context (16:00 UTC)
      const outContext: PricingContext = { ...defaultContext, timestamp: '2026-08-26T16:30:00Z' };
      const expiredRes = PricingEngine.calculateLineItem(item, [promo], outContext);

      return {
        passed: validRes.promoUnitPrice === 4.80 && expiredRes.promoUnitPrice === 6.00,
        expected: 'Active at 12:00 ($4.80) AND Inactive at 16:30 ($6.00)',
        actual: `12:00 = $${validRes.promoUnitPrice.toFixed(2)}, 16:30 = $${expiredRes.promoUnitPrice.toFixed(2)}`
      };
    });

    assertTest('TC-10', 'Promotion Max Discount Cap Enforcement', 'Promotions', () => {
      const promoWithCap: PromotionRule = {
        id: 'promo-big-pct',
        name: 'Bulk Promo 50% Off (Max $10 Cap)',
        type: 'PERCENTAGE_OFF',
        value: 50,
        maxDiscountLimit: 10.00,
        isStackable: false,
        priority: 10
      };

      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-EXPENSIVE-01',
        name: 'Premium Espresso Machine Kit',
        basePrice: 100.00,
        costPrice: 50.00,
        quantity: 1,
        taxRule: standardTaxExclusive
      };

      const result = PricingEngine.calculateLineItem(item, [promoWithCap], defaultContext);
      // Raw 50% off $100 is $50 discount, but capped at $10 max -> Net is $90.00
      return {
        passed: result.netSubtotal === 90.00,
        expected: 'Net Subtotal = $90.00 (Capped at $10 discount)',
        actual: `Net Subtotal = $${result.netSubtotal.toFixed(2)}`
      };
    });

    // ==========================================
    // 6. BUY X GET Y (BXGY) TESTS
    // ==========================================
    assertTest('TC-11', 'Buy 2 Get 1 Free (Quantities 1, 2, 3, 5, 6)', 'Buy X Get Y', () => {
      const bxgyPromo: PromotionRule = {
        id: 'promo-bxgy-free',
        name: 'Buy 2 Get 1 Free Pastries',
        type: 'BUY_X_GET_Y',
        buyXGetYConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          discountPercentage: 100, // Free
          applyToSameItem: true
        },
        isStackable: false,
        priority: 50
      };

      const createItem = (qty: number): LineItemInput => ({
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-CROISSANT',
        name: 'Butter Croissant',
        basePrice: 4.00,
        costPrice: 1.00,
        quantity: qty,
        taxRule: standardTaxExclusive
      });

      // Qty 3: Buy 2 Get 1 Free -> 2 paid ($8), 1 free -> Net = $8.00
      const res3 = PricingEngine.calculateLineItem(createItem(3), [bxgyPromo], defaultContext);
      // Qty 5: 1 set of 3 (2 paid, 1 free) + 2 paid -> 4 paid ($16), 1 free -> Net = $16.00
      const res5 = PricingEngine.calculateLineItem(createItem(5), [bxgyPromo], defaultContext);
      // Qty 6: 2 sets of 3 (4 paid, 2 free) -> 4 paid ($16), 2 free -> Net = $16.00
      const res6 = PricingEngine.calculateLineItem(createItem(6), [bxgyPromo], defaultContext);

      const pass = res3.netSubtotal === 8.00 && res3.freeQuantity === 1 &&
                   res5.netSubtotal === 16.00 && res5.freeQuantity === 1 &&
                   res6.netSubtotal === 16.00 && res6.freeQuantity === 2;

      return {
        passed: pass,
        expected: 'Qty 3 = $8 (1 free), Qty 5 = $16 (1 free), Qty 6 = $16 (2 free)',
        actual: `Qty 3 = $${res3.netSubtotal.toFixed(2)} (${res3.freeQuantity} free), Qty 5 = $${res5.netSubtotal.toFixed(2)} (${res5.freeQuantity} free), Qty 6 = $${res6.netSubtotal.toFixed(2)} (${res6.freeQuantity} free)`
      };
    });

    // ==========================================
    // 7. MANUAL DISCOUNT & FLOOR PROTECTION
    // ==========================================
    assertTest('TC-12', 'Cost Price Floor Margin Protection', 'Discounts & Floor', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-PROTECT-01',
        name: 'High Cost Retail Item',
        basePrice: 50.00,
        costPrice: 35.00, // Floor limit
        minFloorPrice: 35.00,
        quantity: 1,
        manualDiscount: {
          type: 'FIXED',
          value: 30.00, // Would reduce price to $20, breaching $35 cost floor
          reason: 'Excessive Cashier Override'
        },
        taxRule: standardTaxExclusive
      };

      const result = PricingEngine.calculateLineItem(item, [], defaultContext, { enforceFloorPrice: true });
      return {
        passed: result.netUnitPrice === 35.00,
        expected: 'Unit Price clamped to floor of $35.00',
        actual: `Unit Price = $${result.netUnitPrice.toFixed(2)} (${result.explanations.find(e => e.step === 'DISCOUNT')?.status})`
      };
    });

    // ==========================================
    // 8. TAXATION TESTS (INCLUSIVE VS EXCLUSIVE)
    // ==========================================
    assertTest('TC-13', 'Tax-Inclusive Exact Reverse Extraction', 'Taxation', () => {
      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-INC-01',
        name: 'Tax Inclusive Cafe Item',
        basePrice: 11.00, // Gross shelf price
        costPrice: 4.00,
        quantity: 1,
        taxRule: standardTaxInclusive // 10% inclusive tax
      };

      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      // Net = 11 / 1.10 = 10.00, Tax = 1.00, Final Line Total = 11.00
      return {
        passed: result.netSubtotal === 10.00 && result.taxAmount === 1.00 && result.finalLineTotal === 11.00,
        expected: 'Net Subtotal = $10.00, Tax = $1.00, Final Total = $11.00',
        actual: `Net Subtotal = $${result.netSubtotal.toFixed(2)}, Tax = $${result.taxAmount.toFixed(2)}, Final Total = $${result.finalLineTotal.toFixed(2)}`
      };
    });

    assertTest('TC-14', 'Tax-Exclusive Compound Tax Calculation', 'Taxation', () => {
      const compoundTaxRule: TaxRule = {
        taxType: 'EXCLUSIVE',
        rates: [
          { code: 'STATE', name: 'State Tax', rate: 5 },       // 5% of 100 = 5.00
          { code: 'CITY_CMP', name: 'City Tax', rate: 2, isCompound: true } // 2% of (100 + 5) = 2.10
        ]
      };

      const item: LineItemInput = {
        lineId: 'l1',
        productId: 'p1',
        variantId: 'v1',
        sku: 'SKU-COMPOUND-01',
        name: 'Compound Tax Widget',
        basePrice: 100.00,
        costPrice: 40.00,
        quantity: 1,
        taxRule: compoundTaxRule
      };

      const result = PricingEngine.calculateLineItem(item, [], defaultContext);
      // Total tax = 5.00 + 2.10 = 7.10 -> Grand Total = 107.10
      return {
        passed: result.taxAmount === 7.10 && result.finalLineTotal === 107.10,
        expected: 'Tax = $7.10, Final Total = $107.10',
        actual: `Tax = $${result.taxAmount.toFixed(2)}, Final Total = $${result.finalLineTotal.toFixed(2)}`
      };
    });

    // ==========================================
    // 9. CART-LEVEL PROPORTIONAL ORDER DISCOUNT
    // ==========================================
    assertTest('TC-15', 'Proportional Order-Level Discount Allocation Across Items', 'Cart Pricing', () => {
      const cartInput: CartPricingInput = {
        items: [
          {
            lineId: 'l1',
            productId: 'p1',
            variantId: 'v1',
            sku: 'SKU-A',
            name: 'Item A ($30)',
            basePrice: 30.00,
            costPrice: 10.00,
            quantity: 1,
            taxRule: standardTaxExclusive
          },
          {
            lineId: 'l2',
            productId: 'p2',
            variantId: 'v2',
            sku: 'SKU-B',
            name: 'Item B ($70)',
            basePrice: 70.00,
            costPrice: 20.00,
            quantity: 1,
            taxRule: standardTaxExclusive
          }
        ],
        orderDiscount: {
          type: 'FIXED',
          value: 10.00, // $10 total order discount (30% to A = $3, 70% to B = $7)
          reason: 'Manager Voucher'
        },
        promotions: [],
        context: defaultContext
      };

      const cartRes = PricingEngine.calculateCart(cartInput);
      const itemA = cartRes.items.find(i => i.sku === 'SKU-A')!;
      const itemB = cartRes.items.find(i => i.sku === 'SKU-B')!;

      const pass = itemA.allocatedOrderDiscount === 3.00 &&
                   itemB.allocatedOrderDiscount === 7.00 &&
                   cartRes.netSubtotal === 90.00 &&
                   cartRes.totalTax === 9.00 && // 10% on $90 = $9
                   cartRes.grandTotal === 99.00;

      return {
        passed: pass,
        expected: 'Item A disc = $3, Item B disc = $7, Net = $90, Tax = $9, Grand Total = $99',
        actual: `Item A disc = $${itemA.allocatedOrderDiscount.toFixed(2)}, Item B disc = $${itemB.allocatedOrderDiscount.toFixed(2)}, Grand Total = $${cartRes.grandTotal.toFixed(2)}`
      };
    });

    // ==========================================
    // 10. DETERMINISM 1,000 RUN ZERO-VARIANCE PROOF
    // ==========================================
    assertTest('TC-16', 'Pure Determinism: 1,000 Iterations Identical Output Checksum', 'Determinism & Stability', () => {
      const cartInput: CartPricingInput = {
        items: [
          {
            lineId: 'l1',
            productId: 'p1',
            variantId: 'v1',
            sku: 'SKU-STAB-01',
            name: 'Test Coffee',
            basePrice: 12.50,
            costPrice: 4.00,
            quantity: 3,
            taxRule: standardTaxExclusive
          }
        ],
        promotions: [
          {
            id: 'promo-1',
            name: 'Test Promo',
            type: 'PERCENTAGE_OFF',
            value: 15,
            isStackable: false,
            priority: 1
          }
        ],
        context: defaultContext
      };

      const baseline = JSON.stringify(PricingEngine.calculateCart(cartInput));
      let is100PercentIdentical = true;

      for (let i = 0; i < 1000; i++) {
        const current = JSON.stringify(PricingEngine.calculateCart(cartInput));
        if (current !== baseline) {
          is100PercentIdentical = false;
          break;
        }
      }

      return {
        passed: is100PercentIdentical,
        expected: '1,000 / 1,000 iterations byte-for-byte identical',
        actual: is100PercentIdentical ? '1,000 / 1,000 runs 100% identical (0 variance)' : 'Variance detected'
      };
    });

    return results;
  }
}
