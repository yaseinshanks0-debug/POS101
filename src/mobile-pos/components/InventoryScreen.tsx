import React, { useState } from 'react';
import { 
  Package, 
  ArrowLeftRight, 
  Sliders, 
  History, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Warehouse, 
  Search, 
  Filter, 
  Send,
  Building,
  Check
} from 'lucide-react';
import { MobileProduct, StockMovement, StockTransfer } from '../types';

interface InventoryScreenProps {
  products: MobileProduct[];
  stockMovements: StockMovement[];
  transfers: StockTransfer[];
  isArabic: boolean;
  onApplyStockAdjustment: (variantId: string, delta: number, reason: string) => void;
  onDispatchTransfer: (transferId: string) => void;
  onReceiveTransfer: (transferId: string) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  products,
  stockMovements,
  transfers,
  isArabic,
  onApplyStockAdjustment,
  onDispatchTransfer,
  onReceiveTransfer,
}) => {
  const [activeTab, setActiveTab] = useState<'levels' | 'movements' | 'transfers'>('levels');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [adjustmentModalVariant, setAdjustmentModalVariant] = useState<{ id: string; name: string; sku: string; currentStock: number } | null>(null);
  const [adjustmentDelta, setAdjustmentDelta] = useState<string>('5');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Count Reconciliation / Audit');

  // Flatten variants with parent product data
  const allVariants = products.flatMap(p => 
    p.variants.map(v => ({
      ...v,
      productName: p.name,
      productNameAr: p.nameAr,
      category: p.category,
      isTaxable: p.isTaxable,
      parentCode: p.code,
    }))
  );

  const filteredVariants = allVariants.filter(v => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = v.productName.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q) || v.barcode.includes(q);
    return matchesSearch;
  });

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentModalVariant) return;
    const delta = parseInt(adjustmentDelta, 10);
    if (!isNaN(delta) && delta !== 0) {
      onApplyStockAdjustment(adjustmentModalVariant.id, delta, adjustmentReason);
      setAdjustmentModalVariant(null);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header & Sub-tab Switcher */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'إدارة المخزون والتحويلات اللوجستية' : 'Inventory & Stock Logistics'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'مستويات المخزون، سجل الحركات المزدوجة، والتحويلات بين الفروع' : 'Multi-location stock levels, double-entry movement ledger, and inter-store transfers.'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('levels')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'levels' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isArabic ? 'الأرصدة الحالية' : 'Stock on Hand'}
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'movements' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isArabic ? 'سجل الحركات' : 'Movement Ledger'}
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'transfers' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isArabic ? 'التحويلات بين الفروع' : 'Transfers'}
          </button>
        </div>
      </div>

      {/* TAB 1: Stock on Hand Levels */}
      {activeTab === 'levels' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Location Filter */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={isArabic ? 'بحث باسم المنتج أو SKU أو الباركود...' : 'Search variant SKU, name, barcode...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Stock Table */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filteredVariants.map((v) => {
                const isLow = v.stockOnHand <= v.reorderPoint;
                return (
                  <div
                    key={v.id}
                    className={`p-3 rounded-xl border transition flex flex-col justify-between bg-slate-900 ${
                      isLow ? 'border-amber-700/60 bg-amber-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-slate-100">
                            {v.productName}
                          </div>
                          <div className="text-[11px] text-emerald-400 font-medium">{v.variantName}</div>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                          {v.sku}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-800/80 text-center text-xs">
                        <div className="bg-slate-950/60 p-1.5 rounded-lg">
                          <div className="text-[10px] text-slate-400">Stock on Hand</div>
                          <div className={`font-bold mt-0.5 ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {v.stockOnHand}
                          </div>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg">
                          <div className="text-[10px] text-slate-400">Cost Price</div>
                          <div className="font-bold text-slate-200 mt-0.5">${(v.costPrice || 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-950/60 p-1.5 rounded-lg">
                          <div className="text-[10px] text-slate-400">Retail Price</div>
                          <div className="font-bold text-slate-200 mt-0.5">${(v.retailPrice || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400 font-mono">
                        Barcode: {v.barcode}
                      </div>
                      <button
                        onClick={() => setAdjustmentModalVariant({ id: v.id, name: `${v.productName} (${v.variantName})`, sku: v.sku, currentStock: v.stockOnHand })}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                      >
                        {isArabic ? 'تعديل الرصيد' : 'Adjust Stock'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Double-Entry Movement Ledger */}
      {activeTab === 'movements' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl bg-slate-900 overflow-hidden">
            {stockMovements.map((mov) => (
              <div key={mov.id} className="p-3 sm:p-4 flex items-center justify-between text-xs hover:bg-slate-850 transition">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl text-xs font-bold font-mono mt-0.5 ${
                    mov.quantityDelta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{mov.productName} ({mov.variantName})</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-slate-300">{mov.sku}</span>
                      <span>Ref: {mov.referenceId}</span>
                      <span>• {mov.sourceLocation} → {mov.destinationLocation}</span>
                    </div>
                    {mov.note && <div className="text-[10px] text-amber-300/80 mt-1 italic">{mov.note}</div>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                    {mov.type}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {mov.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Inter-Store Transfers */}
      {activeTab === 'transfers' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {transfers.map((trf) => (
            <div key={trf.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{trf.transferNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    trf.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    trf.status === 'DISPATCHED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {trf.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {trf.sourceStoreName} → {trf.destStoreName}
                </div>
              </div>

              {/* Items in transfer */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                {trf.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>{item.productName} ({item.sku})</span>
                    <span className="font-bold text-emerald-400">{item.quantity} units</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                {trf.status === 'DRAFT' && (
                  <button
                    onClick={() => onDispatchTransfer(trf.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Dispatch Shipment (Stock Out)
                  </button>
                )}
                {trf.status === 'DISPATCHED' && (
                  <button
                    onClick={() => onReceiveTransfer(trf.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Receive Shipment (Stock In)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {adjustmentModalVariant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">Stock Adjustment</h3>
            <p className="text-xs text-slate-300">{adjustmentModalVariant.name}</p>
            <div className="text-xs text-slate-400">Current Stock: <span className="font-bold text-white">{adjustmentModalVariant.currentStock}</span></div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quantity Delta (+ or -):</label>
                <input
                  type="number"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-lg font-bold text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Adjustment Reason:</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
                >
                  <option value="Count Reconciliation / Audit">Count Reconciliation / Physical Audit</option>
                  <option value="Damaged / Broken Goods">Damaged / Broken Goods</option>
                  <option value="Expired Shelf Life">Expired Shelf Life</option>
                  <option value="Supplier Return">Supplier Return</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentModalVariant(null)}
                  className="flex-1 py-2 bg-slate-800 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Commit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
