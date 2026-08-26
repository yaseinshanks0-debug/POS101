import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Tag, 
  Barcode, 
  DollarSign, 
  Percent, 
  Layers, 
  Edit3, 
  Star,
  CheckCircle,
  Filter
} from 'lucide-react';
import { MobileProduct, MobileProductVariant } from '../types';

interface ProductsScreenProps {
  products: MobileProduct[];
  isArabic: boolean;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({
  products,
  isArabic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MobileProduct | null>(null);

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q) || 
      p.variants.some(v => v.sku.toLowerCase().includes(q) || v.barcode.includes(q));
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'كتالوج المنتجات والمصفوفات' : 'Products & Multi-Variant Catalog'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'الباركود، أسعار الجملة والتجزئة، وحدات القياس، والضريبة' : 'Barcode mapping, wholesale/retail pricing matrices, units of measure, and taxability.'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isArabic ? 'بحث بالاسم، الكود، الباركود...' : 'Search product or barcode...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Split View: Products Table & Variant Matrix Inspector */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Product List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 border-r border-slate-800">
          {filteredProducts.map((p) => {
            const isSelected = selectedProduct?.id === p.id;
            const totalStock = p.variants.reduce((sum, v) => sum + v.stockOnHand, 0);

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  isSelected 
                    ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover bg-slate-950 shrink-0"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center font-bold text-xs text-white shrink-0`}>
                      {p.code}
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-xs text-slate-100 flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-slate-300">{p.code}</span>
                      <span>{p.category}</span>
                      <span>• {p.variants.length} variant(s)</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-xs text-emerald-400">
                    ${(p.variants[0]?.retailPrice || 0).toFixed(2)}
                  </div>
                  <span className={`text-[10px] font-medium ${totalStock <= 15 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {totalStock} in stock
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Product Variant Matrix Inspector */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900/60 p-4 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 border-slate-800">
          {selectedProduct ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedProduct.name}</h3>
                  <p className="text-[10px] text-slate-400">Category: {selectedProduct.category}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedProduct.isTaxable ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-slate-800 text-slate-400'
                }`}>
                  {selectedProduct.isTaxable ? 'Taxable (8.25%)' : 'Tax Exempt'}
                </span>
              </div>

              {/* Variant Matrix Table */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Variants & SKUs ({selectedProduct.variants.length})</span>
                </div>

                <div className="space-y-2">
                  {selectedProduct.variants.map((v) => (
                    <div key={v.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-xs text-white">{v.variantName}</div>
                          <div className="text-[10px] font-mono text-emerald-400 mt-0.5">SKU: {v.sku}</div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          ${(v.retailPrice || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-900">
                        <div>
                          <span className="text-slate-500">Barcode:</span>
                          <div className="font-mono text-slate-300 mt-0.5">{v.barcode}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Floor Price Limit:</span>
                          <div className="font-mono text-slate-300 mt-0.5">${(v.minPrice || v.retailPrice || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Cost Price:</span>
                          <div className="font-mono text-slate-300 mt-0.5">${(v.costPrice || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Stock on Hand:</span>
                          <div className="font-bold text-slate-200 mt-0.5">{v.stockOnHand || 0} units</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Select any product to inspect its multi-variant matrix, pricing tiers, and barcodes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
