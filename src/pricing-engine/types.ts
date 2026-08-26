/**
 * DETERMINISTIC RETAIL PRICING & TAXATION ENGINE
 * Production-grade Domain Models & Interfaces
 * 
 * Pipeline Sequence:
 * Base Price → Store Override → Customer Price → Quantity Break → Promotion → Discount → Tax → Final Price
 */

export type RoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'CEIL' | 'FLOOR';

export type ConflictResolutionStrategy = 
  | 'LOWEST_PRICE'       // Best deal for customer
  | 'HIGHEST_PRIORITY'   // Highest priority rule wins
  | 'STRICT_HIERARCHY'   // Standard pipeline hierarchy
  | 'COMPOUND';          // Compound stackable rules

export type PriceLevel = 'RETAIL' | 'VIP' | 'WHOLESALE' | 'EMPLOYEE' | 'DISTRIBUTOR';

export interface StoreOverride {
  id: string;
  storeId: string;
  overridePrice: number;
  priority?: number; // Higher number = higher priority
  validFrom?: string; // ISO 8601
  validTo?: string;   // ISO 8601
  reason?: string;
}

export interface CustomerPriceRule {
  id: string;
  customerId?: string;
  customerTier?: PriceLevel | string;
  type: 'FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'AMOUNT_OFF';
  value: number; // Price in dollars or discount percentage/amount
  contractId?: string;
  validFrom?: string;
  validTo?: string;
  priority?: number;
}

export interface QuantityBreakRule {
  id: string;
  minQuantity: number;
  maxQuantity?: number; // Inclusive upper bound, undefined = infinity
  breakType: 'TIERED_UNIT_PRICE' | 'PERCENTAGE_DISCOUNT' | 'AMOUNT_OFF_UNIT';
  value: number; // Tier unit price, or percentage off, or dollar amount off
  description?: string;
}

export type PromotionType = 
  | 'PROMO_UNIT_PRICE'
  | 'PERCENTAGE_OFF'
  | 'FIXED_AMOUNT_OFF'
  | 'BUY_X_GET_Y';

export interface BuyXGetYConfig {
  buyQuantity: number;       // e.g. 2
  getQuantity: number;       // e.g. 1
  discountPercentage: number;// 100 for Free, 50 for 50% off
  maxRewardApplications?: number; // Max times reward can be applied per order
  applyToSameItem: boolean;
  rewardVariantId?: string;  // If different item
}

export interface PromotionRule {
  id: string;
  code?: string;
  name: string;
  type: PromotionType;
  value?: number; // For PROMO_UNIT_PRICE, PERCENTAGE_OFF, FIXED_AMOUNT_OFF
  buyXGetYConfig?: BuyXGetYConfig;
  
  // Scopes
  productVariantIds?: string[];
  categoryIds?: string[];
  storeIds?: string[];
  customerTiers?: (PriceLevel | string)[];

  // Eligibility Rules
  minQuantity?: number;
  minSubtotal?: number;
  maxDiscountLimit?: number; // Maximum dollar discount allowed from this promo
  
  // Schedules (Deterministic)
  validFrom?: string; // ISO 8601
  validTo?: string;   // ISO 8601
  allowedDaysOfWeek?: number[]; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  allowedTimeRange?: {
    startTime: string; // "HH:MM" (24-hour)
    endTime: string;   // "HH:MM"
  };

  isStackable: boolean;
  priority: number; // Higher number = higher precedence
}

export interface ManualDiscount {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  reason?: string;
  authorizedBy?: string;
}

export interface TaxRateItem {
  code: string;
  name: string;
  rate: number; // e.g. 8.25 for 8.25%
  isCompound?: boolean;
}

export interface TaxRule {
  taxType: 'INCLUSIVE' | 'EXCLUSIVE' | 'EXEMPT';
  rates: TaxRateItem[];
  taxCategoryCode?: string;
}

export interface PricingContext {
  storeId: string;
  customerId?: string;
  customerTier?: PriceLevel | string;
  timestamp: string; // ISO 8601 date string for deterministic evaluation
  appliedCouponCodes?: string[];
  channel?: 'POS' | 'MOBILE_POS' | 'KIOSK' | 'ECOMMERCE';
  currency?: string;
}

export interface LineItemInput {
  lineId: string;
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  basePrice: number;
  costPrice: number;
  minFloorPrice?: number; // Absolute lowest price allowed (margin protection)
  quantity: number;
  categoryIds?: string[];
  
  // Embedded or Attached Rules
  storeOverrides?: StoreOverride[];
  customerPriceRules?: CustomerPriceRule[];
  quantityBreaks?: QuantityBreakRule[];
  taxRule: TaxRule;
  manualDiscount?: ManualDiscount;
}

export interface PricingPolicyConfig {
  conflictResolutionStrategy: ConflictResolutionStrategy;
  allowStackingPromotions: boolean;
  enforceFloorPrice: boolean; // Protect cost/margin
  maxDiscountPercentageCap?: number; // Global limit e.g. 70%
  roundingMode: RoundingMode;
  orderDiscountAllocation: 'PROPORTIONAL_BY_VALUE' | 'EQUAL_BY_ITEM';
}

export type PipelineStepName = 
  | 'BASE_PRICE'
  | 'STORE_OVERRIDE'
  | 'CUSTOMER_PRICE'
  | 'QUANTITY_BREAK'
  | 'PROMOTION'
  | 'DISCOUNT'
  | 'TAX'
  | 'FINAL_PRICE';

export interface StepExplanation {
  step: PipelineStepName;
  stepIndex: number;
  inputUnitPrice: number;
  outputUnitPrice: number;
  inputSubtotal: number;
  outputSubtotal: number;
  adjustmentAmount: number; // Positive or negative
  adjustmentPercentage?: number;
  ruleApplied?: string;
  ruleId?: string;
  status: 'APPLIED' | 'SKIPPED' | 'OVERRIDDEN' | 'REJECTED' | 'FLOOR_CAPPED';
  rationale: string;
}

export interface LineItemPricingResult {
  lineId: string;
  variantId: string;
  sku: string;
  name: string;
  quantity: number;
  
  // Pipeline Step Intermediates
  baseUnitPrice: number;
  storeOverrideUnitPrice: number;
  customerUnitPrice: number;
  quantityBreakUnitPrice: number;
  promoUnitPrice: number;
  manualDiscountUnitPrice: number;
  
  // Net Pre-tax & Taxed
  netUnitPrice: number;
  taxInclusiveUnitPrice: number;
  
  // Subtotals & Discounts
  grossSubtotal: number; // baseUnitPrice * quantity
  netSubtotal: number;   // netUnitPrice * quantity
  totalLineDiscount: number;
  allocatedOrderDiscount: number;
  effectiveSubtotal: number; // netSubtotal - allocatedOrderDiscount
  
  // Free / Reward Quantities (BXGY)
  freeQuantity: number;
  paidQuantity: number;
  
  // Taxation
  taxType: 'INCLUSIVE' | 'EXCLUSIVE' | 'EXEMPT';
  taxRatePercent: number;
  taxAmount: number;
  
  // Final Charge
  finalLineTotal: number;
  effectiveUnitRate: number; // finalLineTotal / quantity
  
  // Audit Explanations
  explanations: StepExplanation[];
}

export interface TaxBreakdownDetail {
  taxCode: string;
  name: string;
  ratePercent: number;
  taxableAmount: number;
  taxAmount: number;
  isInclusive: boolean;
}

export interface CartPricingInput {
  items: LineItemInput[];
  orderDiscount?: ManualDiscount;
  promotions: PromotionRule[];
  context: PricingContext;
  policies?: Partial<PricingPolicyConfig>;
}

export interface CartPricingResult {
  items: LineItemPricingResult[];
  currency: string;
  
  // Aggregated Totals
  grossSubtotal: number;
  totalLineDiscounts: number;
  orderDiscountAmount: number;
  totalSavings: number;
  netSubtotal: number;
  
  // Taxes
  totalTax: number;
  taxBreakdown: TaxBreakdownDetail[];
  
  // Grand Total
  grandTotal: number;
  
  // Analytics
  effectiveSavingsPercentage: number;
  totalCost: number;
  grossMarginAmount: number;
  grossMarginPercentage: number;
  
  // Deterministic Metadata
  evaluationTimestamp: string;
  engineVersion: string;
  isDeterministic: boolean;
  auditTrail: string[];
}
