import React, { useState } from 'react';
import { Printer, CheckCircle, Download, X, Share2, Copy, FileText } from 'lucide-react';
import { MobileSalesOrder } from '../types';
import { HardwareSimulator } from '../hardware/HardwareSimulator';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: MobileSalesOrder | null;
  isArabic: boolean;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  isArabic,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    HardwareSimulator.playThermalPrintSound();
    HardwareSimulator.playCashDrawerKick();

    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 2500);
    }, 800);
  };

  const receiptPlainText = `
========================================
       DOWNTOWN FLAGSHIP BRANCH
       104 Market Blvd, Suite 200
       Phone: +1 (555) 019-2831
       Tax ID: US-TX-981723491
========================================
Receipt #: ${order.orderNumber}
Date: ${new Date(order.createdAt).toLocaleString()}
Cashier: ${order.cashierName}
${order.customerName ? `Customer: ${order.customerName}` : 'Customer: Walk-In'}
----------------------------------------
ITEM                      QTY    TOTAL
----------------------------------------
${order.items.map(item => 
  `${item.productName.substring(0, 20).padEnd(22)} ${item.quantity}x  $${((item.unitPrice * item.quantity) - (item.discountValue || 0)).toFixed(2)}`
).join('\n')}
----------------------------------------
Subtotal:                      $${order.subtotalAmount.toFixed(2)}
Discount:                     -$${order.discountAmount.toFixed(2)}
Sales Tax (8.25%):             $${order.taxAmount.toFixed(2)}
----------------------------------------
GRAND TOTAL:                   $${order.grandTotal.toFixed(2)}
----------------------------------------
Payments:
${order.payments.map(p => `  ${p.method.padEnd(14)}: $${p.amount.toFixed(2)}`).join('\n')}
Change Given:                  $${order.changeAmount.toFixed(2)}
${order.loyaltyPointsEarned > 0 ? `Loyalty Points Earned:        +${order.loyaltyPointsEarned} pts\n` : ''}
========================================
       THANK YOU FOR YOUR VISIT!
    Items returnable within 30 days
========================================
`.trim();

  const handleCopyText = () => {
    navigator.clipboard.writeText(receiptPlainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {isArabic ? 'إيصال الدفع الحراري ESC/POS' : 'ESC/POS Thermal Receipt'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {order.orderNumber} • {paperWidth}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Size Selector & Action Toolbar */}
        <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                paperWidth === '80mm' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              80mm (Standard)
            </button>
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                paperWidth === '58mm' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              58mm (Pocket)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyText}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 text-[11px] transition"
              title="Copy Receipt Text"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Thermal Receipt Paper Roll Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex justify-center items-start">
          <div
            className={`bg-white text-slate-900 shadow-xl rounded-sm p-4 sm:p-6 font-mono text-[11px] sm:text-xs leading-relaxed transition-all ${
              paperWidth === '58mm' ? 'w-[250px]' : 'w-[310px]'
            }`}
            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
          >
            {/* Store Branding */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <div className="font-bold text-sm sm:text-base tracking-wider uppercase">
                DOWNTOWN FLAGSHIP
              </div>
              <div className="text-[10px] text-slate-600">POS Retail & Inventory</div>
              <div className="text-[10px] text-slate-600 mt-1">104 Market Blvd, Suite 200</div>
              <div className="text-[10px] text-slate-600">Tel: +1 (555) 019-2831</div>
              <div className="text-[9px] text-slate-500">Tax Registration: US-TX-981723491</div>
            </div>

            {/* Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Receipt #:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date:</span>
                <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cashier:</span>
                <span>{order.cashierName}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer:</span>
                  <span className="font-bold text-emerald-700">{order.customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] text-slate-700 border-b border-slate-200 pb-1">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-medium truncate pr-2">{item.productName}</span>
                    <span className="font-bold shrink-0">
                      ${((item.unitPrice * item.quantity) - (item.discountValue || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{item.quantity} x ${item.unitPrice.toFixed(2)} {item.variantName ? `(${item.variantName})` : ''}</span>
                    {item.discountValue > 0 && <span className="text-red-600 font-medium">Disc: -${item.discountValue.toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>${order.subtotalAmount.toFixed(2)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Order Discount:</span>
                  <span>-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax (8.25%):</span>
                <span>${order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-800">
                <span>TOTAL:</span>
                <span>${order.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Tender & Payment Details */}
            <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-slate-400">
              <div className="font-bold text-slate-700 mb-0.5">PAID VIA:</div>
              {order.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{p.method} {p.cardLast4 ? `(**** ${p.cardLast4})` : ''}</span>
                  <span>${p.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-slate-600 pt-0.5">
                <span>Change Returned:</span>
                <span className="font-bold">${order.changeAmount.toFixed(2)}</span>
              </div>
              {order.loyaltyPointsEarned > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Points Earned:</span>
                  <span>+{order.loyaltyPointsEarned} pts</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer Notice */}
            <div className="pt-3 text-center space-y-2">
              <div className="flex flex-col items-center">
                {/* Simulated ESC/POS Code128 Barcode */}
                <div className="h-9 w-44 bg-slate-900 flex items-center justify-center text-white text-[9px] tracking-widest font-mono">
                  ||| | |||| || ||| | ||| ||
                </div>
                <span className="text-[9px] text-slate-600 mt-0.5">{order.orderNumber}</span>
              </div>
              <div className="text-[9px] text-slate-500 uppercase leading-tight">
                Thank you for your business!<br />
                Retain receipt for returns within 30 days.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 bg-slate-800 border-t border-slate-700 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            {printSuccess && (
              <span className="text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                <CheckCircle className="w-4 h-4" /> Printed & Drawer Solenoid Kicked!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Printing...' : (isArabic ? 'طباعة الإيصال الحراري' : 'Print Thermal Receipt')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
