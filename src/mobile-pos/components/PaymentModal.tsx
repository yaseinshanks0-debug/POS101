import React, { useState } from 'react';
import { 
  CreditCard, 
  Banknote, 
  UserCheck, 
  Award, 
  Gift, 
  X, 
  Check, 
  Trash2, 
  Plus, 
  Smartphone, 
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Customer, CartItem, PaymentMethod, PaymentSplit, MobileSalesOrder } from '../types';
import { HardwareSimulator } from '../hardware/HardwareSimulator';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  customer?: Customer;
  onCompleteSale: (payments: PaymentSplit[], changeAmount: number) => void;
  isArabic: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  discountTotal,
  taxTotal,
  grandTotal,
  customer,
  onCompleteSale,
  isArabic,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<string>(grandTotal.toFixed(2));
  const [paymentsList, setPaymentsList] = useState<PaymentSplit[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nfcTapping, setNfcTapping] = useState(false);

  if (!isOpen) return null;

  const totalPaid = paymentsList.reduce((sum, p) => sum + p.amount, 0);
  const remainingDue = Math.max(0, grandTotal - totalPaid);

  const tenderedNumeric = parseFloat(cashTendered) || 0;
  const currentCashChange = selectedMethod === 'CASH' && tenderedNumeric > remainingDue
    ? tenderedNumeric - remainingDue
    : 0;

  // Quick Cash Denomination buttons
  const cashDenominations = [
    { label: 'Exact', amount: remainingDue },
    { label: '$10', amount: 10 },
    { label: '$20', amount: 20 },
    { label: '$50', amount: 50 },
    { label: '$100', amount: 100 },
  ];

  const handleAddSplitPayment = (method: PaymentMethod, amount: number, cardLast4?: string) => {
    if (amount <= 0) return;
    setPaymentsList(prev => [...prev, { method, amount: Math.min(amount, remainingDue), cardLast4 }]);
  };

  const handleRemoveSplit = (index: number) => {
    setPaymentsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleDirectComplete = () => {
    setIsProcessing(true);

    let finalPayments: PaymentSplit[] = [];
    let change = 0;

    if (paymentsList.length > 0) {
      finalPayments = [...paymentsList];
      if (remainingDue > 0) {
        finalPayments.push({
          method: selectedMethod,
          amount: remainingDue,
          cardLast4: selectedMethod === 'CARD' ? '4242' : undefined,
        });
      }
    } else {
      if (selectedMethod === 'CASH') {
        const tendered = parseFloat(cashTendered) || grandTotal;
        change = Math.max(0, tendered - grandTotal);
        finalPayments = [{ method: 'CASH', amount: Math.min(tendered, grandTotal) }];
      } else if (selectedMethod === 'CARD') {
        finalPayments = [{ method: 'CARD', amount: grandTotal, cardLast4: '4242' }];
      } else if (selectedMethod === 'STORE_CREDIT') {
        finalPayments = [{ method: 'STORE_CREDIT', amount: grandTotal }];
      } else if (selectedMethod === 'LOYALTY_POINTS') {
        finalPayments = [{ method: 'LOYALTY_POINTS', amount: grandTotal }];
      } else {
        finalPayments = [{ method: 'GIFT_CARD', amount: grandTotal }];
      }
    }

    // Hardware kick
    HardwareSimulator.playCashDrawerKick();

    setTimeout(() => {
      setIsProcessing(false);
      onCompleteSale(finalPayments, change);
    }, 450);
  };

  const simulateNfcCardTap = () => {
    setNfcTapping(true);
    HardwareSimulator.playBarcodeBeep();
    setTimeout(() => {
      setNfcTapping(false);
      handleDirectComplete();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-white">
              {isArabic ? 'إتمام الدفع واختيار وسيلة السداد' : 'Checkout & Tender Payment'}
            </h3>
            <p className="text-xs text-slate-400">
              {cartItems.length} {isArabic ? 'منتجات في السلة' : 'items in cart'}
              {customer && ` • ${customer.name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Due Balance Card */}
        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isArabic ? 'المبلغ المستحق الإجمالي' : 'Total Balance Due'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-0.5">
              ${grandTotal.toFixed(2)}
            </div>
          </div>

          {remainingDue < grandTotal && (
            <div className="text-right">
              <div className="text-xs text-amber-400 font-medium">
                {isArabic ? 'المتبقي للسداد:' : 'Remaining Due:'}
              </div>
              <div className="text-xl font-bold text-amber-300">
                ${remainingDue.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
          {/* Payment Method Selector Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <button
              onClick={() => setSelectedMethod('CASH')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                selectedMethod === 'CASH'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span className="font-semibold text-xs">{isArabic ? 'نقداً' : 'Cash'}</span>
            </button>

            <button
              onClick={() => setSelectedMethod('CARD')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                selectedMethod === 'CARD'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-semibold text-xs">{isArabic ? 'بطاقة بنكية' : 'Card'}</span>
            </button>

            <button
              onClick={() => setSelectedMethod('STORE_CREDIT')}
              disabled={!customer || customer.creditLimit === 0}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                selectedMethod === 'STORE_CREDIT'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 ring-1 ring-purple-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="font-semibold text-xs">{isArabic ? 'آجل / حساب' : 'Credit'}</span>
            </button>

            <button
              onClick={() => setSelectedMethod('LOYALTY_POINTS')}
              disabled={!customer || customer.loyaltyPoints < 100}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                selectedMethod === 'LOYALTY_POINTS'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
              }`}
            >
              <Award className="w-5 h-5" />
              <span className="font-semibold text-xs">{isArabic ? 'نقاط الولاء' : 'Points'}</span>
            </button>

            <button
              onClick={() => setSelectedMethod('GIFT_CARD')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                selectedMethod === 'GIFT_CARD'
                  ? 'bg-pink-600/20 border-pink-500 text-pink-300 ring-1 ring-pink-500'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Gift className="w-5 h-5" />
              <span className="font-semibold text-xs">{isArabic ? 'بطاقة هدية' : 'Gift Card'}</span>
            </button>
          </div>

          {/* Conditional Method Controls */}
          {selectedMethod === 'CASH' && (
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  {isArabic ? 'المبلغ النقدي المستلم:' : 'Cash Tendered Amount:'}
                </label>
                {currentCashChange > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                    {isArabic ? 'المتبقي للعميل:' : 'Change:'} ${currentCashChange.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Fast Cash Tender Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {cashDenominations.map((denom) => (
                  <button
                    key={denom.label}
                    type="button"
                    onClick={() => setCashTendered(denom.amount.toFixed(2))}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition"
                  >
                    {denom.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedMethod === 'CARD' && (
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="font-semibold text-white">
                  {isArabic ? 'قارئ البطاقات اللاسلكي / تلامسي NFC جاهز' : 'Ready for Contactless / Chip Reader'}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isArabic ? 'مرر بطاقة الدفع أو انقر للمحاكاة الفورية' : 'Tap customer NFC card or mobile wallet on terminal'}
                </p>
              </div>
              <button
                type="button"
                onClick={simulateNfcCardTap}
                disabled={nfcTapping}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-2 shadow-md"
              >
                {nfcTapping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isArabic ? 'جاري قراءة البطاقة...' : 'Authorizing Card...'}</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>{isArabic ? 'محاكاة تمرير البطاقة (NFC Tap)' : 'Simulate NFC Card Tap (EMV Approved)'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {selectedMethod === 'STORE_CREDIT' && customer && (
            <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-medium">Customer: {customer.name}</span>
                <span className="text-purple-400 font-mono">Limit: ${(customer.creditLimit || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-purple-200">
                Current Unpaid Balance: <span className="font-bold">${(customer.creditBalance || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-400">
                Post-sale Balance: <span className="font-bold text-white">${((customer.creditBalance || 0) + (grandTotal || 0)).toFixed(2)}</span>
              </div>
            </div>
          )}

          {selectedMethod === 'LOYALTY_POINTS' && customer && (
            <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-300 font-medium">{customer.name} Loyalty Points</span>
                <span className="font-bold text-amber-400">{customer.loyaltyPoints || 0} pts</span>
              </div>
              <div className="text-xs text-slate-300">
                Redemption Rate: 100 pts = $1.00 • Max redeemable: ${((customer.loyaltyPoints || 0) / 100).toFixed(2)}
              </div>
            </div>
          )}

          {/* Applied Split Payments Table */}
          {paymentsList.length > 0 && (
            <div className="border border-slate-700 rounded-xl p-3 bg-slate-900/80 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{isArabic ? 'الدفعات المجزأة المضافة:' : 'Split Payments Added:'}</span>
                <span className="text-emerald-400">${totalPaid.toFixed(2)} of ${grandTotal.toFixed(2)}</span>
              </div>
              {paymentsList.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-800 p-2 rounded-lg">
                  <span className="font-medium text-slate-200">{p.method} {p.cardLast4 ? `(**** ${p.cardLast4})` : ''}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">${p.amount.toFixed(2)}</span>
                    <button
                      onClick={() => handleRemoveSplit(idx)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm font-semibold transition"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {remainingDue > 0 && (
              <button
                type="button"
                onClick={() => handleAddSplitPayment(selectedMethod, selectedMethod === 'CASH' ? (parseFloat(cashTendered) || remainingDue) : remainingDue)}
                className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition"
              >
                {isArabic ? '+ تجزئة دفعة' : '+ Add Split'}
              </button>
            )}

            <button
              onClick={handleDirectComplete}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {isArabic ? `إتمام البيع ($${grandTotal.toFixed(2)})` : `Complete Sale ($${grandTotal.toFixed(2)})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
