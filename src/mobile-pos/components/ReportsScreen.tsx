import React, { useState } from 'react';
import { 
  BarChart3, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  CheckCircle, 
  FileSpreadsheet, 
  Lock, 
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { MobileSalesOrder, MobileUser } from '../types';
import { HardwareSimulator } from '../hardware/HardwareSimulator';

interface ReportsScreenProps {
  salesOrders: MobileSalesOrder[];
  currentUser: MobileUser;
  isArabic: boolean;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  salesOrders,
  currentUser,
  isArabic,
}) => {
  const [activeReport, setActiveReport] = useState<'daily' | 'zreport' | 'category'>('daily');
  const [zReportPrinted, setZReportPrinted] = useState(false);

  // Compute metrics
  const completedOrders = salesOrders.filter(o => o.status === 'COMPLETED');
  const totalSales = completedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalTaxes = completedOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  const totalDiscounts = completedOrders.reduce((sum, o) => sum + o.discountAmount, 0);

  // Breakdown by payment method
  const cashTotal = completedOrders.reduce((sum, o) => {
    const cashP = o.payments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
    return sum + cashP;
  }, 0);

  const cardTotal = completedOrders.reduce((sum, o) => {
    const cardP = o.payments.filter(p => p.method === 'CARD').reduce((s, p) => s + p.amount, 0);
    return sum + cardP;
  }, 0);

  const creditTotal = completedOrders.reduce((sum, o) => {
    const credP = o.payments.filter(p => p.method === 'STORE_CREDIT').reduce((s, p) => s + p.amount, 0);
    return sum + credP;
  }, 0);

  const handlePrintZReport = () => {
    HardwareSimulator.playThermalPrintSound();
    setZReportPrinted(true);
    setTimeout(() => setZReportPrinted(false), 3000);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'تقارير المبيعات وإغلاق الوردية (Z-Report)' : 'Sales Reports & Shift Reconciliation'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'مطابقة الصندوق، إجمالي الضرائب، وتقارير نهاية اليوم Z' : 'Daily cashier reconciliation, tax collection ledger, and End-of-Day Z-Report.'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveReport('daily')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeReport === 'daily' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Summary
          </button>
          <button
            onClick={() => setActiveReport('zreport')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeReport === 'zreport' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Z-Report (Shift Close)
          </button>
        </div>
      </div>

      {activeReport === 'daily' ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Revenue</span>
              <div className="text-2xl font-black text-emerald-400">${totalSales.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">{completedOrders.length} completed transactions</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tax Collected (8.25%)</span>
              <div className="text-2xl font-black text-blue-400">${totalTaxes.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">Government sales tax ledger</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Discounts Granted</span>
              <div className="text-2xl font-black text-amber-400">${totalDiscounts.toFixed(2)}</div>
              <div className="text-[11px] text-slate-500">Promotions & VIP tier deductions</div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white">Payment Method Distribution</h3>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Cash Payments (Drawer Cash)</span>
                  <span className="text-emerald-400 font-bold">${cashTotal.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalSales > 0 ? (cashTotal / totalSales) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Credit / Debit Card (EMV / Contactless)</span>
                  <span className="text-blue-400 font-bold">${cardTotal.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalSales > 0 ? (cardTotal / totalSales) * 100 : 0}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Customer Store Credit (Accounts Receivable)</span>
                  <span className="text-purple-400 font-bold">${creditTotal.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalSales > 0 ? (creditTotal / totalSales) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-slate-800">
              <div className="font-extrabold text-base text-white">END OF DAY Z-REPORT</div>
              <div className="text-slate-400 mt-0.5">Shift #004 • Cashier: {currentUser.name}</div>
              <div className="text-[10px] text-slate-500">{new Date().toLocaleString()}</div>
            </div>

            <div className="space-y-1.5 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Opening Cash Float:</span>
                <span>$200.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gross Sales:</span>
                <span>${(totalSales + totalDiscounts).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Discounts:</span>
                <span>-${totalDiscounts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Sales:</span>
                <span>${(totalSales - totalTaxes).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tax Total:</span>
                <span>${totalTaxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                <span>TOTAL REVENUE:</span>
                <span>${totalSales.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-300 mb-1">DRAWER RECONCILIATION:</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Cash in Drawer:</span>
                <span className="font-bold text-emerald-400">${(200 + cashTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Card Settlement Batch:</span>
                <span className="font-bold text-blue-400">${cardTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePrintZReport}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>{zReportPrinted ? 'Z-Report Printed Successfully!' : 'Close Shift & Print Thermal Z-Report'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
