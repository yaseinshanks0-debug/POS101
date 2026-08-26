import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  ArrowDown, 
  Tag, 
  Percent, 
  Users, 
  Receipt, 
  Sparkles,
  ShieldCheck,
  Clock,
  Store,
  Layers,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  FileCode2,
  Info,
  Gift,
  Flame,
  Scale
} from 'lucide-react';
import { 
  PricingEngine, 
  PricingEngineTestSuite, 
  TestCaseResult, 
  LineItemInput, 
  PricingContext, 
  PromotionRule, 
  TaxRule, 
  PriceLevel 
} from '../pricing-engine';

export const PricingPipelineSimulator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'tests' | 'architecture'>('simulator');
  
  // Pipeline Input States
  const [basePrice, setBasePrice] = useState<number>(10.00);
  const [costPrice, setCostPrice] = useState<number>(4.00);
  const [quantity, setQuantity] = useState<number>(4);
  const [storeId, setStoreId] = useState<string>('store-downtown');
  const [hasStoreOverride, setHasStoreOverride] = useState<boolean>(false);
  const [storeOverridePrice, setStoreOverridePrice] = useState<number>(12.00);
  
  const [customerTier, setCustomerTier] = useState<PriceLevel>('VIP');
  const [enableCustomerRule, setEnableCustomerRule] = useState<boolean>(true);
  
  const [enableQuantityBreaks, setEnableQuantityBreaks] = useState<boolean>(true);
  const [selectedPromoPreset, setSelectedPromoPreset] = useState<'none' | 'percent_15' | 'bxgy_free' | 'bxgy_half' | 'flash_sale'>('bxgy_free');
  
  const [manualDiscountType, setManualDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [manualDiscountValue, setManualDiscountValue] = useState<number>(0);
  const [enforceFloorPrice, setEnforceFloorPrice] = useState<boolean>(true);
  
  const [taxType, setTaxType] = useState<'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT'>('EXCLUSIVE');
  const [taxRatePercent, setTaxRatePercent] = useState<number>(8.25);
  const [simulatedTime, setSimulatedTime] = useState<string>('2026-08-26T12:00:00Z');

  // Test Suite State
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  // Apply Quick Presets
  const applyPreset = (preset: 'standard' | 'vip_happy_hour' | 'bxgy' | 'bulk_wholesale' | 'floor_clamped') => {
    switch (preset) {
      case 'standard':
        setBasePrice(10.00);
        setCostPrice(4.00);
        setQuantity(2);
        setStoreId('store-downtown');
        setHasStoreOverride(false);
        setCustomerTier('RETAIL');
        setEnableCustomerRule(false);
        setEnableQuantityBreaks(false);
        setSelectedPromoPreset('none');
        setManualDiscountValue(0);
        setTaxType('EXCLUSIVE');
        setTaxRatePercent(8.25);
        break;
      case 'vip_happy_hour':
        setBasePrice(15.00);
        setCostPrice(5.00);
        setQuantity(2);
        setStoreId('store-downtown');
        setHasStoreOverride(false);
        setCustomerTier('VIP');
        setEnableCustomerRule(true);
        setEnableQuantityBreaks(false);
        setSelectedPromoPreset('percent_15');
        setManualDiscountValue(0);
        setTaxType('EXCLUSIVE');
        setTaxRatePercent(8.25);
        break;
      case 'bxgy':
        setBasePrice(6.00);
        setCostPrice(1.50);
        setQuantity(5);
        setStoreId('store-downtown');
        setHasStoreOverride(false);
        setCustomerTier('RETAIL');
        setEnableCustomerRule(false);
        setEnableQuantityBreaks(false);
        setSelectedPromoPreset('bxgy_free');
        setManualDiscountValue(0);
        setTaxType('EXCLUSIVE');
        setTaxRatePercent(8.25);
        break;
      case 'bulk_wholesale':
        setBasePrice(12.00);
        setCostPrice(4.50);
        setQuantity(15);
        setStoreId('store-downtown');
        setHasStoreOverride(false);
        setCustomerTier('WHOLESALE');
        setEnableCustomerRule(true);
        setEnableQuantityBreaks(true);
        setSelectedPromoPreset('none');
        setManualDiscountValue(5);
        setManualDiscountType('PERCENTAGE');
        setTaxType('EXCLUSIVE');
        setTaxRatePercent(8.25);
        break;
      case 'floor_clamped':
        setBasePrice(20.00);
        setCostPrice(15.00);
        setQuantity(1);
        setStoreId('store-downtown');
        setHasStoreOverride(false);
        setCustomerTier('RETAIL');
        setEnableCustomerRule(false);
        setEnableQuantityBreaks(false);
        setSelectedPromoPreset('none');
        setManualDiscountType('FIXED');
        setManualDiscountValue(12.00); // would drop price to $8, breaching $15 cost
        setEnforceFloorPrice(true);
        setTaxType('EXCLUSIVE');
        setTaxRatePercent(8.25);
        break;
    }
  };

  // Run Unit Tests
  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = PricingEngineTestSuite.runAllTests();
      setTestResults(results);
      setIsRunningTests(false);
    }, 150);
  };

  // Deterministic Engine Execution
  const pricingResult = useMemo(() => {
    const taxRule: TaxRule = {
      taxType,
      rates: taxType === 'EXEMPT' ? [] : [{ code: 'TAX_PRIMARY', name: 'Sales Tax', rate: taxRatePercent }]
    };

    const itemInput: LineItemInput = {
      lineId: 'line-sim-1',
      productId: 'prod-sim-1',
      variantId: 'var-sim-1',
      sku: 'SKU-RETAIL-ENGINE',
      name: 'Simulated Retail Item',
      basePrice,
      costPrice,
      minFloorPrice: costPrice,
      quantity,
      storeOverrides: hasStoreOverride ? [
        {
          id: 'ovr-sim',
          storeId: 'store-downtown',
          overridePrice: storeOverridePrice,
          reason: 'Downtown High-Street Premium'
        }
      ] : [],
      customerPriceRules: enableCustomerRule ? [
        {
          id: 'cust-rule-vip',
          customerTier: 'VIP',
          type: 'PERCENTAGE_DISCOUNT',
          value: 10 // 10% off
        },
        {
          id: 'cust-rule-wholesale',
          customerTier: 'WHOLESALE',
          type: 'PERCENTAGE_DISCOUNT',
          value: 20 // 20% off
        },
        {
          id: 'cust-rule-employee',
          customerTier: 'EMPLOYEE',
          type: 'PERCENTAGE_DISCOUNT',
          value: 30 // 30% off
        }
      ] : [],
      quantityBreaks: enableQuantityBreaks ? [
        { id: 'qb-1', minQuantity: 5, maxQuantity: 9, breakType: 'TIERED_UNIT_PRICE', value: Math.max(0, basePrice * 0.9), description: '5-9 Units (10% Tier)' },
        { id: 'qb-2', minQuantity: 10, breakType: 'TIERED_UNIT_PRICE', value: Math.max(0, basePrice * 0.8), description: '10+ Units (20% Bulk Tier)' }
      ] : [],
      manualDiscount: manualDiscountValue > 0 ? {
        type: manualDiscountType,
        value: manualDiscountValue,
        reason: 'Cashier Simulation Override'
      } : undefined,
      taxRule
    };

    const promotions: PromotionRule[] = [];
    if (selectedPromoPreset === 'percent_15') {
      promotions.push({
        id: 'promo-15',
        name: 'Afternoon Delight 15% Off',
        type: 'PERCENTAGE_OFF',
        value: 15,
        isStackable: false,
        priority: 10
      });
    } else if (selectedPromoPreset === 'bxgy_free') {
      promotions.push({
        id: 'promo-bxgy-free',
        name: 'Buy 2 Get 1 Free (100% Off 3rd Item)',
        type: 'BUY_X_GET_Y',
        buyXGetYConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          discountPercentage: 100,
          applyToSameItem: true
        },
        isStackable: false,
        priority: 20
      });
    } else if (selectedPromoPreset === 'bxgy_half') {
      promotions.push({
        id: 'promo-bxgy-half',
        name: 'Buy 1 Get 1 @ 50% Off',
        type: 'BUY_X_GET_Y',
        buyXGetYConfig: {
          buyQuantity: 1,
          getQuantity: 1,
          discountPercentage: 50,
          applyToSameItem: true
        },
        isStackable: false,
        priority: 20
      });
    } else if (selectedPromoPreset === 'flash_sale') {
      promotions.push({
        id: 'promo-flash',
        name: 'Flash Sale $6.99 Flat Price',
        type: 'PROMO_UNIT_PRICE',
        value: 6.99,
        isStackable: false,
        priority: 30
      });
    }

    const context: PricingContext = {
      storeId,
      customerId: 'cust-sim-001',
      customerTier,
      timestamp: simulatedTime,
      currency: 'USD'
    };

    return PricingEngine.calculateLineItem(itemInput, promotions, context, {
      enforceFloorPrice,
      conflictResolutionStrategy: 'LOWEST_PRICE'
    });
  }, [
    basePrice, costPrice, quantity, storeId, hasStoreOverride, storeOverridePrice,
    customerTier, enableCustomerRule, enableQuantityBreaks, selectedPromoPreset,
    manualDiscountType, manualDiscountValue, enforceFloorPrice, taxType, taxRatePercent, simulatedTime
  ]);

  return (
    <div className="flex-1 bg-slate-950 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Senior Retail Systems Engineering
            </span>
            <span className="text-xs text-slate-400 font-mono">v{PricingEngine.VERSION}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calculator className="w-7 h-7 text-emerald-400" />
            Deterministic Retail Pricing & Taxation Engine
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
            Mathematical 8-stage pipeline with strict floor price enforcement, customer contract precedence, Buy X Get Y reward sets, tax-inclusive reverse extraction, and audit trace generation.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'simulator'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Live Pipeline Simulator
          </button>

          <button
            onClick={() => {
              setActiveTab('tests');
              if (testResults.length === 0) handleRunTests();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Automated Unit Tests
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'architecture'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Clean Architecture Specs
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE PIPELINE SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          
          {/* Quick Presets Bar */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Edge-Case Testing Presets:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset('standard')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
              >
                Standard Catalog
              </button>
              <button
                onClick={() => applyPreset('vip_happy_hour')}
                className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-200 rounded-lg font-medium transition"
              >
                VIP + 15% Promo
              </button>
              <button
                onClick={() => applyPreset('bxgy')}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/50 text-amber-200 rounded-lg font-medium transition"
              >
                Buy 2 Get 1 Free (5 Qty)
              </button>
              <button
                onClick={() => applyPreset('bulk_wholesale')}
                className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-200 rounded-lg font-medium transition"
              >
                Wholesale Bulk (15 Qty)
              </button>
              <button
                onClick={() => applyPreset('floor_clamped')}
                className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/50 text-red-200 rounded-lg font-medium transition flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                Floor Margin Protection
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Configuration Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Line Item Parameters
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Pure Inputs</span>
              </h3>

              {/* 1. Base Price & Cost Floor */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Base Retail ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-amber-300 font-mono font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-emerald-400 font-mono font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* 2. Store Overrides */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    Store Location Override
                  </span>
                  <input
                    type="checkbox"
                    checked={hasStoreOverride}
                    onChange={(e) => setHasStoreOverride(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </div>
                {hasStoreOverride && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">Downtown Store Price:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={storeOverridePrice}
                      onChange={(e) => setStoreOverridePrice(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* 3. Customer Tier Pricing */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    Customer Tier Contract
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCustomerRule}
                      onChange={(e) => setEnableCustomerRule(e.target.checked)}
                    />
                    Enable Tier Rules
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {(['RETAIL', 'VIP', 'WHOLESALE', 'EMPLOYEE'] as PriceLevel[]).map(tier => (
                    <button
                      key={tier}
                      onClick={() => setCustomerTier(tier)}
                      className={`py-1.5 rounded-lg border font-bold text-[10px] transition ${
                        customerTier === tier
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Quantity Breaks & Promotions */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Volume Breaks & Tier Pricing
                  </span>
                  <input
                    type="checkbox"
                    checked={enableQuantityBreaks}
                    onChange={(e) => setEnableQuantityBreaks(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </div>
                {enableQuantityBreaks && (
                  <div className="text-[11px] text-purple-300 bg-purple-950/40 p-2 rounded-lg border border-purple-800/40">
                    Tier 1: 5-9 units (10% off) • Tier 2: 10+ units (20% off)
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5 mb-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    Promotional Campaign:
                  </span>
                  <select
                    value={selectedPromoPreset}
                    onChange={(e) => setSelectedPromoPreset(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-200 font-medium outline-none"
                  >
                    <option value="none">None (Standard Pricing)</option>
                    <option value="bxgy_free">🎁 Buy 2 Get 1 Free (BXGY 100% off)</option>
                    <option value="bxgy_half">🎁 Buy 1 Get 1 @ 50% Off (BXGY)</option>
                    <option value="percent_15">⚡ Happy Hour 15% Off</option>
                    <option value="flash_sale">⚡ Flash Sale ($6.99 Flat Price)</option>
                  </select>
                </div>
              </div>

              {/* 5. Manual Discount & Cost Protection */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-pink-400" />
                    Cashier Manual Discount
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-emerald-400 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={enforceFloorPrice}
                      onChange={(e) => setEnforceFloorPrice(e.target.checked)}
                    />
                    Floor Protection
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <select
                    value={manualDiscountType}
                    onChange={(e) => setManualDiscountType(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualDiscountValue}
                    onChange={(e) => setManualDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Discount value"
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                  />
                </div>
              </div>

              {/* 6. Tax Settings */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-teal-400" />
                  Taxation Regime
                </span>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(['EXCLUSIVE', 'INCLUSIVE', 'EXEMPT'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTaxType(t)}
                      className={`py-1.5 rounded-lg border font-bold text-[10px] transition ${
                        taxType === t
                          ? 'bg-teal-600 border-teal-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {taxType !== 'EXEMPT' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-slate-400">Sales Tax Rate (%):</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Mathematical Pipeline Audit Trace (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Grand Settlement Banner */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4" />
                    Final Line Settlement
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 font-mono">
                    ${pricingResult.finalLineTotal.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    ${pricingResult.effectiveUnitRate.toFixed(2)} / unit • {pricingResult.quantity} unit(s)
                    {pricingResult.freeQuantity > 0 && (
                      <span className="text-amber-400 font-bold ml-2">
                        ({pricingResult.freeQuantity} Free Reward Item{pricingResult.freeQuantity > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 text-right">
                  <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400">Original Gross:</span>{' '}
                    <span className="font-bold text-slate-300 font-mono">${pricingResult.grossSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800 text-xs">
                    <span className="text-emerald-400">Total Customer Savings:</span>{' '}
                    <span className="font-bold text-emerald-300 font-mono">-${pricingResult.totalLineDiscount.toFixed(2)}</span>
                  </div>
                  <div className="bg-teal-950/80 px-3 py-1.5 rounded-xl border border-teal-800 text-xs">
                    <span className="text-teal-400">{pricingResult.taxType} Tax:</span>{' '}
                    <span className="font-bold text-teal-300 font-mono">${pricingResult.taxAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 8-Stage Pipeline Breakdown List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Deterministic 8-Step Pipeline Audit Trace
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Deterministic Math • 0 Floating Leaks
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {pricingResult.explanations.map((exp, idx) => {
                    const isApplied = exp.status === 'APPLIED';
                    const isFloorCapped = exp.status === 'FLOOR_CAPPED';
                    const isSkipped = exp.status === 'SKIPPED';

                    return (
                      <div
                        key={exp.step}
                        className={`p-3.5 rounded-xl border transition ${
                          isFloorCapped
                            ? 'bg-red-950/30 border-red-800/60'
                            : isApplied && exp.adjustmentAmount !== 0
                            ? 'bg-emerald-950/30 border-emerald-800/50'
                            : 'bg-slate-950/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-white tracking-wide">
                              {exp.step.replace('_', ' ')}
                            </span>
                            {exp.ruleApplied && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                {exp.ruleApplied}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider ${
                                isFloorCapped
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : isApplied
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {exp.status}
                            </span>

                            <div className="text-right font-mono font-bold text-xs">
                              <span className="text-slate-400">${exp.inputUnitPrice.toFixed(2)}</span>
                              <span className="text-slate-600 mx-1">→</span>
                              <span className={exp.outputUnitPrice < exp.inputUnitPrice ? 'text-emerald-400' : 'text-slate-200'}>
                                ${exp.outputUnitPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-300 mt-2 pl-7 flex items-start justify-between gap-4">
                          <p>{exp.rationale}</p>
                          {exp.adjustmentAmount !== 0 && (
                            <span className={`font-mono text-xs font-bold shrink-0 ${exp.adjustmentAmount < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {exp.adjustmentAmount > 0 ? `+$${exp.adjustmentAmount.toFixed(2)}` : `-$${Math.abs(exp.adjustmentAmount).toFixed(2)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATED UNIT TEST RUNNER */}
      {/* ========================================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Deterministic Pricing Engine Test Suite
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automated regression & edge-case test suite verifying mathematical purity, Buy X Get Y math, schedules, floor caps, and 1,000-run determinism stability.
              </p>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {isRunningTests ? 'Executing Test Runner...' : 'Execute All 16 Test Cases'}
            </button>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testResults.map((tc) => (
              <div
                key={tc.id}
                className={`p-4 rounded-2xl border transition ${
                  tc.passed
                    ? 'bg-slate-900/90 border-emerald-800/40 hover:border-emerald-600/60'
                    : 'bg-red-950/30 border-red-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tc.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-mono text-xs font-bold text-slate-400">{tc.id}</span>
                    <span className="text-xs font-bold text-white">{tc.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{tc.executionTimeMs}ms</span>
                </div>

                <div className="text-xs text-slate-300 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Expected:</span> {tc.expected}
                  </div>
                  <div className={tc.passed ? 'text-emerald-300 font-bold' : 'text-red-400 font-bold'}>
                    <span className="text-slate-500">Actual:</span> {tc.actual}
                  </div>
                  {tc.errorDetails && (
                    <div className="text-red-400 text-[10px] mt-1 pt-1 border-t border-red-900/50">
                      {tc.errorDetails}
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Category: {tc.category}</span>
                  <span className={`font-bold ${tc.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tc.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CLEAN ARCHITECTURE & SPECS */}
      {/* ========================================================================= */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-indigo-400" />
              Clean Architecture Domain Engine Blueprint
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              The pricing engine is built as an independent, side-effect-free pure domain service. It requires no UI frameworks or database drivers, making it 100% portable to Flutter/Dart for offline POS terminal execution on Android, Sunmi, iOS, and POS hardware.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400">1. Pipeline Precedence Hierarchy</h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  <li><strong>Base Price:</strong> Master catalog standard retail unit rate.</li>
                  <li><strong>Store Override:</strong> Location-based surcharge or regional price.</li>
                  <li><strong>Customer Contract:</strong> Direct contract fixed price or loyalty tier %.</li>
                  <li><strong>Quantity Break:</strong> Volume brackets based on total line quantity.</li>
                  <li><strong>Promotions:</strong> Scheduled happy hours, flash sales, Buy X Get Y.</li>
                  <li><strong>Line Discount:</strong> Cashier override with floor margin cap.</li>
                  <li><strong>Taxation:</strong> Tax-exclusive additive or tax-inclusive reverse extraction.</li>
                  <li><strong>Final Settlement:</strong> Effective unit rate and audit trail generation.</li>
                </ol>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-400">2. Determinism & Precision Guarantees</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  <li><strong>Zero Clock Leaks:</strong> Evaluation timestamps are passed explicitly via <code>PricingContext</code>.</li>
                  <li><strong>Exact Half-Up Rounding:</strong> Avoids floating-point precision loss (e.g. <code>0.1 + 0.2 = 0.30000000000000004</code>).</li>
                  <li><strong>Proportional Order Discount:</strong> Remainder cent balancing ensures sum of line items always equals grand total.</li>
                  <li><strong>Offline Idempotency:</strong> 1,000 identical inputs yield identical byte-for-byte output checksums.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
