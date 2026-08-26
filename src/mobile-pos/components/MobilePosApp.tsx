import React, { useState } from 'react';
import { 
  ShoppingBag, 
  LayoutDashboard, 
  Package, 
  History, 
  Users, 
  Truck, 
  BarChart3, 
  Code2, 
  Wifi, 
  WifiOff, 
  Settings, 
  LogOut, 
  Smartphone, 
  Tablet, 
  Globe, 
  Shield, 
  KeyRound, 
  Camera, 
  Database,
  Printer,
  DollarSign
} from 'lucide-react';
import { 
  MobileProduct, 
  MobileProductVariant, 
  CartItem, 
  Customer, 
  HeldSale, 
  MobileSalesOrder, 
  StockMovement, 
  StockTransfer, 
  PurchaseOrder, 
  OutboxMutation, 
  MobileUser,
  PaymentSplit
} from '../types';
import { 
  mockProducts, 
  mockCustomers, 
  mockSalesOrders, 
  mockStockMovements, 
  mockStockTransfers, 
  mockPurchaseOrders, 
  mockOutboxMutations, 
  mockUsers 
} from '../mockData';
import { PosTerminalScreen } from './PosTerminalScreen';
import { DashboardScreen } from './DashboardScreen';
import { InventoryScreen } from './InventoryScreen';
import { ProductsScreen } from './ProductsScreen';
import { SalesHistoryScreen } from './SalesHistoryScreen';
import { CustomersScreen } from './CustomersScreen';
import { PurchasingScreen } from './PurchasingScreen';
import { ReportsScreen } from './ReportsScreen';
import { FlutterCodeExplorer } from './FlutterCodeExplorer';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PaymentModal } from './PaymentModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { OfflineOutboxModal } from './OfflineOutboxModal';
import { HardwareSettingsModal } from './HardwareSettingsModal';
import { HardwareSimulator } from '../hardware/HardwareSimulator';
import { OfflineSyncEngine } from '../offline/OfflineSyncEngine';

type ActiveTab = 'pos' | 'dashboard' | 'inventory' | 'products' | 'sales' | 'customers' | 'purchasing' | 'reports' | 'flutter-code';

export const MobilePosApp: React.FC = () => {
  // App State
  const [currentUser, setCurrentUser] = useState<MobileUser | null>(mockUsers[0]);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [isArabic, setIsArabic] = useState<boolean>(false);
  const [deviceFrameMode, setDeviceFrameMode] = useState<'tablet' | 'phone' | 'fullscreen'>('tablet');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Core POS Domain Data
  const [products, setProducts] = useState<MobileProduct[]>(mockProducts);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(mockCustomers[0]);
  const [salesOrders, setSalesOrders] = useState<MobileSalesOrder[]>(mockSalesOrders);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(mockStockMovements);
  const [transfers, setTransfers] = useState<StockTransfer[]>(mockStockTransfers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [outboxMutations, setOutboxMutations] = useState<OutboxMutation[]>(mockOutboxMutations);

  // Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptModalOrder, setReceiptModalOrder] = useState<MobileSalesOrder | null>(null);
  const [outboxModalOpen, setOutboxModalOpen] = useState(false);
  const [hardwareModalOpen, setHardwareModalOpen] = useState(false);

  // PIN Authentication Handler
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockUsers.find(u => u.pin === pinInput);
    if (user) {
      setCurrentUser(user);
      setPinInput('');
      setPinError(false);
      HardwareSimulator.playBarcodeBeep();
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // Cart Operations
  const handleAddToCart = (product: MobileProduct, variant: MobileProductVariant) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.variantId === variant.id);
      if (existing) {
        return prev.map(item => item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      const newItem: CartItem = {
        id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        productNameAr: product.nameAr,
        variantName: variant.variantName,
        variantNameAr: variant.variantNameAr || '',
        sku: variant.sku,
        barcode: variant.barcode,
        unitPrice: variant.retailPrice,
        costPrice: variant.costPrice,
        quantity: 1,
        discountType: 'percentage',
        discountValue: 0,
        isTaxable: product.isTaxable,
      };
      return [...prev, newItem];
    });
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleSetQuantity = (cartItemId: string, qty: number) => {
    setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  const handleApplyLineDiscount = (cartItemId: string, type: 'percentage' | 'fixed', value: number) => {
    setCartItems(prev => prev.map(item => item.id === cartItemId ? { ...item, discountType: type, discountValue: value } : item));
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setSelectedCustomer(mockCustomers[0]);
  };

  // Hold / Resume Sales
  const handleHoldSale = (note?: string) => {
    if (cartItems.length === 0) return;
    const ticketNumber = `TICK-${100 + heldSales.length + 1}`;
    const subtotal = cartItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const newHeld: HeldSale = {
      id: `held-${Date.now()}`,
      ticketNumber,
      customer: selectedCustomer,
      items: [...cartItems],
      subtotal,
      discountTotal: 0,
      taxTotal: subtotal * 0.0825,
      grandTotal: subtotal * 1.0825,
      note: note || '',
      heldAt: new Date().toISOString(),
      cashierName: currentUser?.name || 'Cashier',
    };
    setHeldSales(prev => [...prev, newHeld]);
    handleClearCart();
  };

  const handleResumeSale = (heldSaleId: string) => {
    const held = heldSales.find(h => h.id === heldSaleId);
    if (!held) return;
    setCartItems(held.items);
    if (held.customer) {
      setSelectedCustomer(held.customer);
    }
    setHeldSales(prev => prev.filter(h => h.id !== heldSaleId));
  };

  // Barcode scanned
  const handleBarcodeScanned = (barcode: string) => {
    for (const prod of products) {
      const v = prod.variants.find(variant => variant.barcode === barcode);
      if (v) {
        handleAddToCart(prod, v);
        return;
      }
    }
  };

  // Complete Checkout & Tender Sale
  const handleCompleteSale = (payments: PaymentSplit[], changeAmount: number) => {
    if (cartItems.length === 0) return;

    const rawSubtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const lineDiscounts = cartItems.reduce((sum, item) => {
      return sum + (item.discountType === 'percentage' ? (item.unitPrice * item.quantity * (item.discountValue / 100)) : item.discountValue);
    }, 0);
    const vipDiscount = selectedCustomer.tier === 'VIP' ? (rawSubtotal - lineDiscounts) * 0.05 : 0;
    const totalDiscount = lineDiscounts + vipDiscount;
    const netSubtotal = rawSubtotal - totalDiscount;
    const salesTax = netSubtotal * 0.0825;
    const grandTotal = netSubtotal + salesTax;

    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    const loyaltyPointsEarned = Math.floor(grandTotal);

    const newOrder: MobileSalesOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      offlineId: `off_${Date.now()}`,
      storeId: 'store-1',
      cashierId: currentUser?.id || 'usr-1',
      cashierName: currentUser?.name || 'Cashier',
      customerId: selectedCustomer.id !== 'cust-walkin' ? selectedCustomer.id : undefined,
      customerName: selectedCustomer.id !== 'cust-walkin' ? selectedCustomer.name : undefined,
      items: [...cartItems],
      subtotalAmount: netSubtotal,
      taxAmount: salesTax,
      discountAmount: totalDiscount,
      grandTotal: grandTotal,
      paidAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      changeAmount: changeAmount,
      payments: payments,
      status: 'COMPLETED',
      loyaltyPointsEarned,
      loyaltyPointsRedeemed: 0,
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING',
      idempotencyKey: `idemp-sale-${orderNum}`,
    };

    // 1. Deduct Stock Levels
    setProducts(prev => prev.map(p => {
      const updatedVariants = p.variants.map(v => {
        const soldItem = cartItems.find(ci => ci.variantId === v.id);
        if (soldItem) {
          return { ...v, stockOnHand: Math.max(0, v.stockOnHand - soldItem.quantity) };
        }
        return v;
      });
      return { ...p, variants: updatedVariants };
    }));

    // 2. Append to Stock Movement double-entry ledger
    const newMovements: StockMovement[] = cartItems.map(item => ({
      id: `mov-${Date.now()}-${item.variantId}`,
      timestamp: new Date().toISOString(),
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName || '',
      sku: item.sku,
      type: 'SALE',
      quantityDelta: -item.quantity,
      unitCost: item.costPrice,
      referenceId: orderNum,
      sourceLocation: 'Downtown Retail Floor',
      destinationLocation: 'Customer Sale POS',
      actor: currentUser?.name || 'Cashier',
    }));
    setStockMovements(prev => [...newMovements, ...prev]);

    // 3. Update Customer Loyalty & Store Credit
    if (selectedCustomer.id !== 'cust-walkin') {
      const creditPaid = payments.find(p => p.method === 'STORE_CREDIT')?.amount || 0;
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomer.id) {
          return {
            ...c,
            loyaltyPoints: c.loyaltyPoints + loyaltyPointsEarned,
            creditBalance: c.creditBalance + creditPaid,
            totalSpend: (c.totalSpend || 0) + grandTotal,
            totalVisits: (c.totalVisits || 0) + 1,
          };
        }
        return c;
      }));
    }

    // 4. Record Offline Outbox Mutation (SQLite)
    const outboxMutation: OutboxMutation = {
      id: `outbox-${Date.now()}`,
      operationId: `op_sale_${Date.now()}`,
      entityType: 'SALES_ORDER',
      entityId: newOrder.id,
      action: 'CREATE',
      payload: newOrder,
      deviceId: 'DEVICE_SUNMI_V2_001',
      userId: currentUser?.id || 'usr-1',
      timestamp: new Date().toISOString(),
      status: isOnline ? 'SYNCED' : 'PENDING',
      retryCount: 0,
      idempotencyKey: `idemp-sale-${orderNum}`,
    };
    setOutboxMutations(prev => [outboxMutation, ...prev]);

    // 5. Append Order to State
    setSalesOrders(prev => [newOrder, ...prev]);

    // 6. Reset Cart & Trigger Thermal Receipt Modal
    handleClearCart();
    setPaymentOpen(false);
    setReceiptModalOrder(newOrder);
  };

  // Stock Adjustment
  const handleApplyStockAdjustment = (variantId: string, delta: number, reason: string) => {
    let variantName = '';
    let sku = '';
    let prodName = '';
    let productId = '';

    setProducts(prev => prev.map(p => {
      const updatedVariants = p.variants.map(v => {
        if (v.id === variantId) {
          variantName = v.variantName;
          sku = v.sku;
          prodName = p.name;
          productId = p.id;
          return { ...v, stockOnHand: Math.max(0, v.stockOnHand + delta) };
        }
        return v;
      });
      return { ...p, variants: updatedVariants };
    }));

    const newMov: StockMovement = {
      id: `mov-adj-${Date.now()}`,
      timestamp: new Date().toISOString(),
      variantId,
      productName: prodName,
      variantName,
      sku,
      type: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      quantityDelta: delta,
      unitCost: 0,
      referenceId: `ADJ-${Date.now().toString().slice(-4)}`,
      sourceLocation: 'Physical Store Count',
      destinationLocation: 'Retail Inventory',
      actor: currentUser?.name || 'Manager',
      note: reason,
    };
    setStockMovements(prev => [newMov, ...prev]);
  };

  // Stock Transfers
  const handleDispatchTransfer = (transferId: string) => {
    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'DISPATCHED' } : t));
  };

  const handleReceiveTransfer = (transferId: string) => {
    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: 'RECEIVED' } : t));
  };

  // Settle Customer Credit
  const handleSettleCredit = (customerId: string, amount: number) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return { ...c, creditBalance: Math.max(0, c.creditBalance - amount) };
      }
      return c;
    }));
  };

  // Add Customer
  const handleAddCustomer = (custData: Partial<Customer>) => {
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      code: `CUST-${Date.now().toString().slice(-4)}`,
      name: custData.name || 'New Customer',
      nameAr: custData.nameAr || custData.name || 'عميل جديد',
      phone: custData.phone || '',
      email: custData.email || '',
      tier: custData.tier || 'REGULAR',
      loyaltyPoints: custData.loyaltyPoints || 50,
      creditLimit: custData.creditLimit || 200,
      creditBalance: 0,
      totalSpend: 0,
      totalVisits: 1,
    };
    setCustomers(prev => [...prev, newCust]);
    setSelectedCustomer(newCust);
  };

  // Purchasing Receive PO GRN
  const handleReceivePO = (poId: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        return { ...po, status: 'RECEIVED' };
      }
      return po;
    }));
  };

  // Order Refund
  const handleProcessRefund = (orderId: string, refundAmount: number, items: CartItem[]) => {
    setSalesOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'REFUNDED' } : o));

    // Restock items
    setProducts(prev => prev.map(p => {
      const updatedVariants = p.variants.map(v => {
        const refundedItem = items.find(ci => ci.variantId === v.id);
        if (refundedItem) {
          return { ...v, stockOnHand: v.stockOnHand + refundedItem.quantity };
        }
        return v;
      });
      return { ...p, variants: updatedVariants };
    }));
  };

  // Manual Trigger Sync
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setOutboxMutations(prev => prev.map(m => ({ ...m, status: 'SYNCED' })));
      setIsSyncing(false);
    }, 1200);
  };

  // If user not authenticated, show Cashier PIN Keypad Lock Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 shadow-lg">
            <ShoppingBag className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Flutter Mobile POS</h1>
            <p className="text-xs text-slate-400 mt-1">
              {isArabic ? 'أدخل رمز PIN لتسجيل دخول الكاشير' : 'Enter 4-digit Cashier Security PIN'}
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[1em] py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white font-mono focus:outline-none focus:border-emerald-500 transition"
              autoFocus
            />

            {pinError && (
              <div className="text-xs text-red-400 font-semibold animate-shake">
                {isArabic ? 'رمز PIN غير صالح' : 'Invalid PIN Code. Try 1234 or 5678'}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-emerald-950/60"
            >
              {isArabic ? 'تسجيل الدخول' : 'Unlock POS Terminal'}
            </button>
          </form>

          {/* Quick Demo Cashier Switcher */}
          <div className="pt-3 border-t border-slate-800 text-left">
            <div className="text-[11px] text-slate-400 font-semibold mb-2">Tap to login as cashier:</div>
            <div className="grid grid-cols-2 gap-2">
              {mockUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u)}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left text-xs transition"
                >
                  <div className="font-semibold text-slate-200">{u.name}</div>
                  <div className="text-[10px] text-slate-400">{u.role} (PIN: {u.pin})</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pendingOutboxCount = outboxMutations.filter(m => m.status === 'PENDING').length;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${isArabic ? 'rtl font-sans' : 'ltr font-sans'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Top Global Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-20 shrink-0">
        {/* Brand & Store */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md">
            POS
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>Retail Mobile POS</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Flutter / Dart
              </span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Network Outbox Indicator */}
          <button
            onClick={() => setOutboxModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition ${
              isOnline 
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-emerald-500' 
                : 'bg-red-950/80 border-red-800 text-red-300 animate-pulse'
            }`}
            title="Outbox & Network Status"
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
            {pendingOutboxCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                {pendingOutboxCount}
              </span>
            )}
          </button>

          {/* Hardware Peripherals Modal */}
          <button
            onClick={() => setHardwareModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Hardware & Bluetooth Printers"
          >
            <Printer className="w-4 h-4 text-purple-400" />
          </button>

          {/* Viewport Frame Mode Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setDeviceFrameMode('tablet')}
              className={`p-1.5 rounded-lg transition ${deviceFrameMode === 'tablet' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Tablet Mode (Dual Pane)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceFrameMode('phone')}
              className={`p-1.5 rounded-lg transition ${deviceFrameMode === 'phone' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Phone Mode (Compact Handheld)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setIsArabic(!isArabic)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{isArabic ? 'English' : 'العربية'}</span>
          </button>

          {/* Cashier Account & Lock */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden sm:block text-right text-xs">
              <div className="font-bold text-slate-200">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400">{currentUser.role}</div>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700 transition"
              title="Lock / Logout POS Terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-16 sm:w-56 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0 z-10">
          <nav className="p-2 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('pos')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'pos' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'نقطة البيع (POS)' : 'Cashier POS'}</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'لوحة التحكم' : 'Dashboard'}</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'inventory' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Package className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'المخزون والتحويلات' : 'Inventory'}</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'products' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'المنتجات والمصفوفات' : 'Products'}</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'sales' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <History className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'سجل المبيعات' : 'Sales History'}</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'customers' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'العملاء والولاء' : 'Customers'}</span>
            </button>

            <button
              onClick={() => setActiveTab('purchasing')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'purchasing' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Truck className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'المشتريات والاستلام' : 'Purchasing'}</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition ${
                activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'التقارير وتقرير Z' : 'Reports & Z'}</span>
            </button>
          </nav>

          {/* Flutter Code Explorer Tab Button */}
          <div className="p-2 border-t border-slate-800">
            <button
              onClick={() => setActiveTab('flutter-code')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-xs font-bold transition border ${
                activeTab === 'flutter-code'
                  ? 'bg-blue-600 text-white border-blue-500 shadow'
                  : 'bg-slate-950 text-blue-400 border-blue-900/50 hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-5 h-5 shrink-0 text-blue-400" />
              <span className="hidden sm:inline">{isArabic ? 'كود Flutter Dart' : 'Flutter Source'}</span>
            </button>
          </div>
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'pos' && (
            <PosTerminalScreen
              products={products}
              cartItems={cartItems}
              customers={customers}
              selectedCustomer={selectedCustomer}
              heldSales={heldSales}
              currentUser={currentUser}
              isArabic={isArabic}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onSetQuantity={handleSetQuantity}
              onApplyLineDiscount={handleApplyLineDiscount}
              onRemoveCartItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onSelectCustomer={setSelectedCustomer}
              onHoldSale={handleHoldSale}
              onResumeSale={handleResumeSale}
              onOpenScanner={() => setScannerOpen(true)}
              onOpenPayment={() => setPaymentOpen(true)}
              onOpenReturnMode={() => setActiveTab('sales')}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardScreen
              salesOrders={salesOrders}
              products={products}
              customers={customers}
              outboxMutations={outboxMutations}
              onNavigateToTab={(t) => setActiveTab(t)}
              isArabic={isArabic}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryScreen
              products={products}
              stockMovements={stockMovements}
              transfers={transfers}
              isArabic={isArabic}
              onApplyStockAdjustment={handleApplyStockAdjustment}
              onDispatchTransfer={handleDispatchTransfer}
              onReceiveTransfer={handleReceiveTransfer}
            />
          )}

          {activeTab === 'products' && (
            <ProductsScreen
              products={products}
              isArabic={isArabic}
            />
          )}

          {activeTab === 'sales' && (
            <SalesHistoryScreen
              orders={salesOrders}
              isArabic={isArabic}
              onReprintReceipt={(order) => setReceiptModalOrder(order)}
              onProcessRefund={handleProcessRefund}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersScreen
              customers={customers}
              isArabic={isArabic}
              onSettleCredit={handleSettleCredit}
              onAddCustomer={handleAddCustomer}
            />
          )}

          {activeTab === 'purchasing' && (
            <PurchasingScreen
              purchaseOrders={purchaseOrders}
              isArabic={isArabic}
              onReceivePO={handleReceivePO}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsScreen
              salesOrders={salesOrders}
              currentUser={currentUser}
              isArabic={isArabic}
            />
          )}

          {activeTab === 'flutter-code' && (
            <FlutterCodeExplorer
              isArabic={isArabic}
            />
          )}
        </main>
      </div>

      {/* Floating Modals */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
        products={products}
        isArabic={isArabic}
      />

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        cartItems={cartItems}
        subtotal={cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0)}
        discountTotal={cartItems.reduce((s, i) => s + (i.discountType === 'percentage' ? (i.unitPrice * i.quantity * (i.discountValue / 100)) : i.discountValue), 0)}
        taxTotal={cartItems.filter(i => i.isTaxable).reduce((s, i) => s + (i.unitPrice * i.quantity * 0.0825), 0)}
        grandTotal={
          cartItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) -
          cartItems.reduce((s, i) => s + (i.discountType === 'percentage' ? (i.unitPrice * i.quantity * (i.discountValue / 100)) : i.discountValue), 0) +
          cartItems.filter(i => i.isTaxable).reduce((s, i) => s + (i.unitPrice * i.quantity * 0.0825), 0)
        }
        customer={selectedCustomer}
        onCompleteSale={handleCompleteSale}
        isArabic={isArabic}
      />

      <ThermalReceiptModal
        isOpen={!!receiptModalOrder}
        onClose={() => setReceiptModalOrder(null)}
        order={receiptModalOrder}
        isArabic={isArabic}
      />

      <OfflineOutboxModal
        isOpen={outboxModalOpen}
        onClose={() => setOutboxModalOpen(false)}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        outboxMutations={outboxMutations}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        isArabic={isArabic}
      />

      <HardwareSettingsModal
        isOpen={hardwareModalOpen}
        onClose={() => setHardwareModalOpen(false)}
        isArabic={isArabic}
      />
    </div>
  );
};
