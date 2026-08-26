import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Printer, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Calendar,
  CreditCard,
  Banknote,
  DollarSign,
  ChevronRight,
  ArrowDownLeft
} from 'lucide-react';
import { MobileSalesOrder, CartItem } from '../types';

interface SalesHistoryScreenProps {
  orders: MobileSalesOrder[];
  isArabic: boolean;
  onReprintReceipt: (order: MobileSalesOrder) => void;
  onProcessRefund: (orderId: string, refundAmount: number, items: CartItem[]) => void;
}

export const SalesHistoryScreen: React.FC<SalesHistoryScreenProps> = ({
  orders,
  isArabic,
  onReprintReceipt,
  onProcessRefund,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<MobileSalesOrder | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    return o.orderNumber.toLowerCase().includes(q) || 
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      o.cashierName.toLowerCase().includes(q);
  });

  const handleRefundSubmit = () => {
    if (selectedOrder) {
      onProcessRefund(selectedOrder.id, selectedOrder.grandTotal, selectedOrder.items);
      setShowRefundDialog(false);
      setSelectedOrder(null);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'سجل المبيعات والعمليات' : 'Sales History & Order Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'استعراض الإيصالات، إعادة الطباعة، ومعالجة المرتجعات' : 'Audit completed transactions, reprint thermal receipts, and issue returns.'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={isArabic ? 'بحث برقم الإيصال أو العميل...' : 'Search receipt # or customer...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Split View: Order List & Detail Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Orders List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 border-r border-slate-800">
          {filteredOrders.map((order) => {
            const isSelected = selectedOrder?.id === order.id;
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  isSelected 
                    ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500' 
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                    ${order.grandTotal.toFixed(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-100 flex items-center gap-2">
                      <span>{order.orderNumber}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        order.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        order.status === 'REFUNDED' ? 'bg-red-950 text-red-300 border border-red-800' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {order.customerName || 'Walk-In'} • {order.items.length} items • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <div className="font-bold text-xs text-emerald-400">${order.grandTotal.toFixed(2)}</div>
                    <span className="text-[9px] text-slate-400">{order.payments.map(p => p.method).join(', ')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Order Detail Inspector */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900/60 p-4 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 border-slate-800">
          {selectedOrder ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedOrder.orderNumber}</h3>
                  <p className="text-[10px] text-slate-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                  {selectedOrder.status}
                </span>
              </div>

              {/* Cashier & Customer Info */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cashier:</span>
                  <span className="font-medium text-slate-200">{selectedOrder.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-medium text-slate-200">{selectedOrder.customerName || 'Walk-In'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sync Status:</span>
                  <span className="text-emerald-400 font-mono">{selectedOrder.syncStatus}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-300">Ordered Items:</div>
                <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 p-2 max-h-44 overflow-y-auto">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <div>
                        <div className="font-medium text-slate-200">{item.productName}</div>
                        <div className="text-[10px] text-slate-500">{item.quantity}x @ ${(item.unitPrice || 0).toFixed(2)}</div>
                      </div>
                      <span className="font-bold text-emerald-400">
                        ${(((item.unitPrice || 0) * (item.quantity || 1)) - (item.discountValue || 0)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>${(selectedOrder.subtotalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax:</span>
                  <span>${(selectedOrder.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Total Paid:</span>
                  <span>${(selectedOrder.grandTotal || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions: Print & Refund */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onReprintReceipt(selectedOrder)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Reprint Receipt</span>
                </button>

                {selectedOrder.status === 'COMPLETED' && (
                  <button
                    onClick={() => setShowRefundDialog(true)}
                    className="px-3 py-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Return / Refund</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Select any completed transaction to inspect details or reprint receipt.</p>
            </div>
          )}
        </div>
      </div>

      {/* Return Confirmation Dialog */}
      {showRefundDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/60 w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              <span>Confirm Order Refund & Restock</span>
            </h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to refund order <span className="font-bold text-white">{selectedOrder.orderNumber}</span> for <span className="font-bold text-emerald-400">${selectedOrder.grandTotal.toFixed(2)}</span>?
            </p>
            <p className="text-[11px] text-slate-400">
              All items will be automatically restocked into the local inventory ledger.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowRefundDialog(false)}
                className="flex-1 py-2 bg-slate-800 text-xs font-semibold rounded-xl text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundSubmit}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg"
              >
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
