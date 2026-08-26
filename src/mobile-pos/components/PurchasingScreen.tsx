import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  CheckCircle, 
  Clock, 
  FileCheck, 
  DollarSign, 
  Building, 
  PackageCheck,
  ChevronRight
} from 'lucide-react';
import { PurchaseOrder, Supplier } from '../types';
import { mockSuppliers } from '../mockData';

interface PurchasingScreenProps {
  purchaseOrders: PurchaseOrder[];
  isArabic: boolean;
  onReceivePO: (poId: string) => void;
}

export const PurchasingScreen: React.FC<PurchasingScreenProps> = ({
  purchaseOrders,
  isArabic,
  onReceivePO,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'suppliers'>('pos');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'المشتريات واستلام البضائع (GRN)' : 'Procurement & Goods Receiving'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'أوامر الشراء، الموردين، وإدخال الشحنات الواردة للمخزن' : 'Purchase orders, vendor catalog, and Goods Received Notes (GRN).'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeSubTab === 'pos' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeSubTab === 'suppliers' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Suppliers Directory
          </button>
        </div>
      </div>

      {activeSubTab === 'pos' ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {purchaseOrders.map((po) => (
            <div
              key={po.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{po.poNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      po.status === 'RECEIVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      po.status === 'ORDERED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Supplier: <span className="text-slate-200 font-medium">{po.supplierName}</span> • Expected: {po.expectedDeliveryDate}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-emerald-400">${(po.totalCost || 0).toFixed(2)}</div>
                  <span className="text-[10px] text-slate-400">{po.items.length} item line(s)</span>
                </div>
              </div>

              {/* Items in PO */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                {po.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>{item.productName} ({item.sku})</span>
                    <span className="font-bold text-slate-200">{item.quantityOrdered} units @ ${(item.unitCost || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Actions: Receive PO GRN */}
              {po.status === 'ORDERED' && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onReceivePO(po.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Receive Shipment & Restock (GRN)</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {mockSuppliers.map((s) => (
            <div key={s.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-white">{s.name}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">Contact: {s.contactPerson}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                  {s.paymentTerms}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-0.5 pt-2 border-t border-slate-800">
                <div>Phone: <span className="text-slate-200">{s.phone}</span></div>
                <div>Email: <span className="text-slate-200">{s.email}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
