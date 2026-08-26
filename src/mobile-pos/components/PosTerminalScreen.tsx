import React, { useState } from 'react';
import { 
  Search, 
  Camera, 
  Star, 
  Trash2, 
  Plus, 
  Minus, 
  Tag, 
  UserCheck, 
  PauseCircle, 
  PlayCircle, 
  RotateCcw, 
  CreditCard, 
  Coffee, 
  ShoppingBag, 
  Percent, 
  Check, 
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  CheckCircle,
  ArrowDownLeft
} from 'lucide-react';
import { 
  MobileProduct, 
  MobileProductVariant, 
  CartItem, 
  Customer, 
  HeldSale, 
  MobileUser,
  MobileSalesOrder
} from '../types';
import { HardwareSimulator } from '../hardware/HardwareSimulator';
import { mockCategories } from '../mockData';

interface PosTerminalScreenProps {
  products: MobileProduct[];
  cartItems: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer;
  heldSales: HeldSale[];
  currentUser: MobileUser;
  isArabic: boolean;
  onAddToCart: (product: MobileProduct, variant: MobileProductVariant) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onSetQuantity: (cartItemId: string, qty: number) => void;
  onApplyLineDiscount: (cartItemId: string, type: 'percentage' | 'fixed', value: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onHoldSale: (note?: string) => void;
  onResumeSale: (heldSaleId: string) => void;
  onOpenScanner: () => void;
  onOpenPayment: () => void;
  onOpenReturnMode: () => void;
}

export const PosTerminalScreen: React.FC<PosTerminalScreenProps> = ({
  products,
  cartItems,
  customers,
  selectedCustomer,
  heldSales,
  currentUser,
  isArabic,
  onAddToCart,
  onUpdateQuantity,
  onSetQuantity,
  onApplyLineDiscount,
  onRemoveCartItem,
  onClearCart,
  onSelectCustomer,
  onHoldSale,
  onResumeSale,
  onOpenScanner,
  onOpenPayment,
  onOpenReturnMode,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<MobileProduct | null>(null);
  const [discountModalItem, setDiscountModalItem] = useState<CartItem | null>(null);
  const [discountInputValue, setDiscountInputValue] = useState<string>('10');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [showHeldSalesDrawer, setShowHeldSalesDrawer] = useState<boolean>(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState<boolean>(false);

  // VIP Customer discount calculation
  const isVipCustomer = selectedCustomer.tier === 'VIP';

  // Filter products by category and fuzzy search
  const filteredProducts = products.filter(product => {
    const matchesCategory = 
      activeCategory === 'all' ? true :
      activeCategory === 'fav' ? product.isFavorite :
      product.category === activeCategory;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesName = product.name.toLowerCase().includes(q) || (product.nameAr && product.nameAr.includes(q));
    const matchesCode = product.code.toLowerCase().includes(q);
    const matchesVariant = product.variants.some(v => 
      v.sku.toLowerCase().includes(q) || 
      v.barcode.includes(q) || 
      v.variantName.toLowerCase().includes(q)
    );

    return matchesCategory && (matchesName || matchesCode || matchesVariant);
  });

  // Calculate cart sums
  const rawSubtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const lineDiscountsTotal = cartItems.reduce((sum, item) => {
    if (item.discountType === 'percentage') {
      return sum + (item.unitPrice * item.quantity * (item.discountValue / 100));
    }
    return sum + item.discountValue;
  }, 0);

  // VIP tier gives automatic 5% additional order discount if no line discount applies
  const vipAutoDiscount = isVipCustomer ? (rawSubtotal - lineDiscountsTotal) * 0.05 : 0;
  const totalDiscount = lineDiscountsTotal + vipAutoDiscount;
  const netSubtotal = Math.max(0, rawSubtotal - totalDiscount);

  // Sales Tax (8.25% only on taxable items)
  const taxableSubtotal = cartItems.filter(i => i.isTaxable).reduce((sum, item) => {
    const itemDisc = item.discountType === 'percentage'
      ? item.unitPrice * item.quantity * (item.discountValue / 100)
      : item.discountValue;
    return sum + Math.max(0, (item.unitPrice * item.quantity) - itemDisc);
  }, 0);
  const salesTax = taxableSubtotal * 0.0825;
  const grandTotal = netSubtotal + salesTax;

  const handleProductTap = (product: MobileProduct) => {
    if (product.variants.length === 1) {
      HardwareSimulator.playBarcodeBeep();
      onAddToCart(product, product.variants[0]);
    } else {
      setSelectedProductForVariants(product);
    }
  };

  const handleApplyDiscountSubmit = () => {
    if (discountModalItem) {
      const val = parseFloat(discountInputValue) || 0;
      onApplyLineDiscount(discountModalItem.id, discountType, val);
      setDiscountModalItem(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* LEFT / TOP: Catalog Catalog & Fast Grid */}
      <div className="flex-1 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Search & Actions Bar */}
        <div className="p-2 sm:p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isArabic ? 'بحث سريع عن المنتجات، الباركود، الكود...' : 'Quick search item name, SKU, or barcode...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={onOpenScanner}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition shrink-0"
            title="Open Camera Barcode Scanner"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? 'ماسح الباركود' : 'Scan'}</span>
          </button>
        </div>

        {/* Category Filter Chips Bar */}
        <div className="p-2 bg-slate-900/60 border-b border-slate-800/80 flex gap-1.5 overflow-x-auto scrollbar-none text-xs">
          {mockCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
              }`}
            >
              {cat.id === 'fav' && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
              <span>{isArabic ? cat.nameAr : cat.name}</span>
            </button>
          ))}
        </div>

        {/* Products Grid (High Density Fast Tap) */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5 content-start">
          {filteredProducts.map((product) => {
            const prices = (product.variants && product.variants.length > 0)
              ? product.variants.map(v => v.retailPrice || 0)
              : [0];
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
            const totalStock = (product.variants || []).reduce((sum, v) => sum + (v.stockOnHand || 0), 0);
            const isLowStock = totalStock <= 15;

            return (
              <button
                key={product.id}
                onClick={() => handleProductTap(product)}
                className="group relative bg-slate-900 hover:bg-slate-800/90 active:scale-[0.98] border border-slate-800 hover:border-emerald-500/50 rounded-xl p-2.5 flex flex-col text-left transition shadow-sm overflow-hidden"
              >
                {/* Top Image or Color Banner */}
                <div className="relative h-20 sm:h-24 w-full rounded-lg overflow-hidden mb-2 bg-slate-950 flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${product.color} flex items-center justify-center text-white/80 font-bold text-lg`}>
                      {product.code}
                    </div>
                  )}

                  {product.isFavorite && (
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-sm text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                    </div>
                  )}

                  {isLowStock && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-red-950/90 border border-red-800 text-[9px] font-bold text-red-300">
                      Low: {totalStock}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-100 group-hover:text-emerald-400 transition line-clamp-1">
                      {isArabic && product.nameAr ? product.nameAr : product.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {product.variants.length > 1 ? `${product.variants.length} variants` : product.variants[0].sku}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                    <span className="text-xs sm:text-sm font-bold text-emerald-400">
                      ${minPrice === maxPrice ? minPrice.toFixed(2) : `${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {totalStock} in stock
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT / BOTTOM: Reactive Cart Terminal Panel */}
      <div className="w-full lg:w-[380px] xl:w-[420px] bg-slate-900 flex flex-col overflow-hidden shadow-2xl shrink-0">
        {/* Cart Header with Customer & Actions */}
        <div className="p-3 bg-slate-800/90 border-b border-slate-700/80 space-y-2">
          {/* Cashier & Branch Badge */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300">{currentUser.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {heldSales.length > 0 && (
                <button
                  onClick={() => setShowHeldSalesDrawer(!showHeldSalesDrawer)}
                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 animate-pulse"
                >
                  <PlayCircle className="w-3 h-3" />
                  <span>Held ({heldSales.length})</span>
                </button>
              )}
              <button
                onClick={onOpenReturnMode}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] flex items-center gap-1 transition"
                title="Process Customer Return / Refund"
              >
                <ArrowDownLeft className="w-3 h-3 text-red-400" />
                <span>Return</span>
              </button>
            </div>
          </div>

          {/* Customer Attachment Selector */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <button
                onClick={() => setShowCustomerPicker(!showCustomerPicker)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs flex items-center justify-between text-left hover:border-emerald-500 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-200 truncate">
                    {selectedCustomer.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedCustomer.tier === 'VIP' && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 text-[10px] font-bold border border-purple-700">
                      VIP 5% OFF
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">▼</span>
                </div>
              </button>

              {/* Customer Dropdown */}
              {showCustomerPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        setShowCustomerPicker(false);
                      }}
                      className={`w-full p-2.5 text-xs text-left border-b border-slate-800 flex items-center justify-between hover:bg-slate-800 transition ${
                        selectedCustomer.id === c.id ? 'bg-emerald-950/40 text-emerald-300' : 'text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.phone} • {c.loyaltyPoints} pts</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800">
                        {c.tier}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 transition shrink-0"
                title="Clear Cart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Held Sales Quick Drawer */}
        {showHeldSalesDrawer && heldSales.length > 0 && (
          <div className="p-2.5 bg-amber-950/40 border-b border-amber-800/60 space-y-1.5 animate-fade-in text-xs">
            <div className="font-semibold text-amber-300 text-[11px] flex justify-between">
              <span>Parked / Held Sales Tickets:</span>
              <button onClick={() => setShowHeldSalesDrawer(false)} className="text-amber-400">✕</button>
            </div>
            {heldSales.map((hs) => (
              <div key={hs.id} className="p-2 rounded-lg bg-slate-900 border border-amber-700/50 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">{hs.ticketNumber} ({hs.items.length} items)</div>
                  <div className="text-[10px] text-slate-400">{hs.note || 'No note'} • ${hs.grandTotal.toFixed(2)}</div>
                </div>
                <button
                  onClick={() => {
                    onResumeSale(hs.id);
                    setShowHeldSalesDrawer(false);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cart Line Items List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3">
                <ShoppingBag className="w-7 h-7 text-slate-400" />
              </div>
              <h4 className="font-semibold text-slate-300 text-sm">
                {isArabic ? 'السلة فارغة' : 'Cart is Empty'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                {isArabic ? 'امسح الباركود أو انقر على المنتجات لإضافتها' : 'Scan a barcode or tap products from the catalog to build cart.'}
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemTotal = (item.unitPrice * item.quantity) - (item.discountType === 'percentage' 
                ? (item.unitPrice * item.quantity * (item.discountValue / 100))
                : item.discountValue);

              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col gap-2 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="pr-2">
                      <div className="font-semibold text-xs text-slate-100">
                        {isArabic && item.productNameAr ? item.productNameAr : item.productName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-emerald-400 font-mono">${item.unitPrice.toFixed(2)}</span>
                        {item.variantName && <span>• {item.variantName}</span>}
                        {item.discountValue > 0 && (
                          <span className="text-amber-400 font-bold bg-amber-950/60 px-1 rounded">
                            -{item.discountType === 'percentage' ? `${item.discountValue}%` : `$${item.discountValue.toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xs sm:text-sm text-emerald-400">
                        ${itemTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper & Line Discount Trigger */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDiscountModalItem(item)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1 transition"
                        title="Apply Line Discount"
                      >
                        <Percent className="w-3 h-3 text-amber-400" />
                        <span>Discount</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onRemoveCartItem(item.id)}
                        className="p-1 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition ml-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Summary Totals & Checkout Button */}
        <div className="p-3.5 bg-slate-850 border-t border-slate-800 space-y-2 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>{isArabic ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
              <span>${rawSubtotal.toFixed(2)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-amber-400 font-medium">
                <span>{isArabic ? 'الخصومات المطبقة:' : 'Discounts:'}</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-400">
              <span>{isArabic ? 'ضريبة المبيعات (8.25%):' : 'Sales Tax (8.25%):'}</span>
              <span>${salesTax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-extrabold text-base sm:text-lg text-emerald-400 pt-1 border-t border-slate-700">
              <span>{isArabic ? 'الإجمالي النهائي:' : 'GRAND TOTAL:'}</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons: Hold Ticket & Tender Checkout */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onHoldSale('Customer fetching card')}
              disabled={cartItems.length === 0}
              className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold transition flex items-center justify-center gap-1.5"
              title="Park / Hold Sale"
            >
              <PauseCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs">{isArabic ? 'تعليق' : 'Hold'}</span>
            </button>

            <button
              onClick={onOpenPayment}
              disabled={cartItems.length === 0}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-40 text-white font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
            >
              <CreditCard className="w-5 h-5" />
              <span>
                {isArabic ? `دفع ($${grandTotal.toFixed(2)})` : `Pay ($${grandTotal.toFixed(2)})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Variant Selector Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">{selectedProductForVariants.name}</h3>
                <p className="text-xs text-slate-400">Select product variant</p>
              </div>
              <button onClick={() => setSelectedProductForVariants(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="py-3 space-y-2 max-h-60 overflow-y-auto">
              {selectedProductForVariants.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    HardwareSimulator.playBarcodeBeep();
                    onAddToCart(selectedProductForVariants, v);
                    setSelectedProductForVariants(null);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 flex items-center justify-between text-left transition group"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-100 group-hover:text-emerald-300">
                      {v.variantName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{v.sku} • Stock: {v.stockOnHand}</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    ${v.retailPrice.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Line Item Discount Modal */}
      {discountModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-4 shadow-2xl text-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Apply Line Discount</h3>
              <button onClick={() => setDiscountModalItem(null)} className="text-slate-400">✕</button>
            </div>
            <p className="text-xs text-slate-400">{discountModalItem.productName}</p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                  discountType === 'percentage' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                  discountType === 'fixed' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Fixed ($)
              </button>
            </div>

            <input
              type="number"
              value={discountInputValue}
              onChange={(e) => setDiscountInputValue(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-lg font-bold text-white focus:outline-none focus:border-amber-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setDiscountModalItem(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyDiscountSubmit}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
