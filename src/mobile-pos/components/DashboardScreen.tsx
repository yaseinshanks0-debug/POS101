import React from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  CloudOff, 
  Users, 
  ArrowUpRight, 
  CreditCard, 
  Package, 
  RefreshCw, 
  Printer, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { MobileSalesOrder, MobileProduct, Customer, OutboxMutation } from '../types';

interface DashboardScreenProps {
  salesOrders: MobileSalesOrder[];
  products: MobileProduct[];
  customers: Customer[];
  outboxMutations: OutboxMutation[];
  onNavigateToTab: (tab: any) => void;
  isArabic: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  salesOrders,
  products,
  customers,
  outboxMutations,
  onNavigateToTab,
  isArabic,
}) => {
  // Aggregate KPI metrics
  const totalSales = salesOrders.reduce((sum, o) => sum + (o.status === 'COMPLETED' ? o.grandTotal : 0), 0);
  const completedOrdersCount = salesOrders.filter(o => o.status === 'COMPLETED').length;
  
  // Calculate approximate gross profit
  let totalCost = 0;
  let totalRevenue = 0;
  salesOrders.filter(o => o.status === 'COMPLETED').forEach(o => {
    o.items.forEach(i => {
      totalRevenue += i.unitPrice * i.quantity;
      totalCost += (i.costPrice || (i.unitPrice * 0.4)) * i.quantity;
    });
  });
  const grossProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 42.5;

  // Low stock variants count (stock <= 15)
  const lowStockCount = products.reduce((acc, p) => {
    return acc + p.variants.filter(v => v.stockOnHand <= v.reorderPoint).length;
  }, 0);

  // Outbox pending sync count
  const pendingSyncCount = outboxMutations.filter(m => m.status === 'PENDING').length;

  // Outstanding customer credit
  const outstandingCredit = customers.reduce((sum, c) => sum + c.creditBalance, 0);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950 text-slate-100 space-y-4">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              {isArabic ? 'الفرع الرئيسي • نشط' : 'Downtown Flagship Branch • Active Shift'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1 animate-pulse">
                <CloudOff className="w-3 h-3" />
                <span>{pendingSyncCount} {isArabic ? 'عمليات معلقة بالمزامنة' : 'Outbox Pending'}</span>
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {isArabic ? 'لوحة المتابعة والمبيعات اليومية' : 'Executive Mobile POS Dashboard'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isArabic ? 'مؤشرات الأداء اللحظية، المخزون، وحالة المزامنة دون اتصال' : 'Real-time performance metrics, local stock levels, and offline outbox status.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('pos')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/50 shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isArabic ? 'نقطة البيع (POS)' : 'Open Cashier Terminal'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Today's Sales */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{isArabic ? 'مبيعات اليوم' : "Today's Sales"}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-white">${totalSales.toFixed(2)}</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-0.5 font-medium mt-1">
              <ArrowUpRight className="w-3 h-3" /> +14.2% vs yesterday
            </div>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{isArabic ? 'عدد العمليات' : 'Transactions'}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-white">{completedOrdersCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Avg Ticket: ${(totalSales / Math.max(1, completedOrdersCount)).toFixed(2)}</div>
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{isArabic ? 'إجمالي الأرباح' : 'Gross Profit'}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-purple-400">${grossProfit.toFixed(2)}</div>
            <div className="text-[11px] text-purple-300 font-medium mt-1">{marginPercent.toFixed(1)}% margin</div>
          </div>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{isArabic ? 'نواقص المخزون' : 'Low Stock'}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-400">{lowStockCount} items</div>
            <button
              onClick={() => onNavigateToTab('inventory')}
              className="text-[11px] text-amber-300 hover:underline flex items-center gap-0.5 mt-1"
            >
              Inspect inventory <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Card 5: Pending Outbox */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{isArabic ? 'صندوق المزامنة' : 'Pending Sync'}</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-cyan-400">{pendingSyncCount}</div>
            <button
              onClick={() => onNavigateToTab('outbox')}
              className="text-[11px] text-cyan-300 hover:underline flex items-center gap-0.5 mt-1"
            >
              View outbox queue <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Card 6: Outstanding Customer Credit */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">{isArabic ? 'الديون المستحقة' : 'Customer Credit'}</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-pink-400">${outstandingCredit.toFixed(2)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Across {customers.filter(c => c.creditBalance > 0).length} accounts</div>
          </div>
        </div>
      </div>

      {/* Quick Access Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateToTab('pos')}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-100">{isArabic ? 'بدء بيع جديد' : 'New POS Sale'}</div>
            <div className="text-[10px] text-slate-400">{isArabic ? 'مسح الباركود والدفع السريع' : 'Scan items & checkout'}</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('inventory')}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group"
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-100">{isArabic ? 'إدارة المخزون والتحويلات' : 'Stock & Transfers'}</div>
            <div className="text-[10px] text-slate-400">{isArabic ? 'سجل الحركات والتعديلات' : 'Double-entry stock ledger'}</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('customers')}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-100">{isArabic ? 'العملاء وبرنامج الولاء' : 'Customers & Loyalty'}</div>
            <div className="text-[10px] text-slate-400">{isArabic ? 'النقاط والائتمان المالي' : 'Credit limit & points ledger'}</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('reports')}
          className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group"
        >
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-100">{isArabic ? 'التقارير وإغلاق الوردية Z' : 'Z-Report & Analytics'}</div>
            <div className="text-[10px] text-slate-400">{isArabic ? 'مطابقة الصندوق والضرائب' : 'Shift closure & margin report'}</div>
          </div>
        </button>
      </div>

      {/* Recent Sales Activity List */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-white">
            {isArabic ? 'أحدث المعاملات المكتملة' : 'Recent POS Completed Transactions'}
          </h3>
          <button
            onClick={() => onNavigateToTab('sales')}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
          >
            {isArabic ? 'عرض كل المبيعات' : 'View all orders'} <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {salesOrders.slice(0, 4).map((order) => (
            <div key={order.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold font-mono">
                  ${order.grandTotal.toFixed(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-200">{order.orderNumber}</div>
                  <div className="text-[10px] text-slate-400">
                    {order.customerName || 'Walk-In'} • {order.items.length} items • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-emerald-400">${order.grandTotal.toFixed(2)}</div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {order.payments.map(p => p.method).join(', ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
