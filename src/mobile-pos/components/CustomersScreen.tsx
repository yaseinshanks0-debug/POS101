import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Award, 
  CreditCard, 
  Phone, 
  Mail, 
  DollarSign, 
  Check, 
  UserPlus, 
  Edit2,
  ShieldCheck
} from 'lucide-react';
import { Customer } from '../types';

interface CustomersScreenProps {
  customers: Customer[];
  isArabic: boolean;
  onSettleCredit: (customerId: string, amount: number) => void;
  onAddCustomer: (customer: Partial<Customer>) => void;
}

export const CustomersScreen: React.FC<CustomersScreenProps> = ({
  customers,
  isArabic,
  onSettleCredit,
  onAddCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>('50');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = parseFloat(settleAmount);
    if (!isNaN(amt) && amt > 0) {
      onSettleCredit(selectedCustomer.id, amt);
      setSettleModalOpen(false);
      setSelectedCustomer(prev => prev ? { ...prev, creditBalance: Math.max(0, prev.creditBalance - amt) } : null);
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    onAddCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '+1 (555) 000-0000',
      email: newCustEmail.trim() || undefined,
      tier: 'REGULAR',
      loyaltyPoints: 50, // Sign-up bonus
      creditLimit: 200,
      creditBalance: 0,
      totalSpend: 0,
      totalVisits: 1,
    });
    setShowAddModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'إدارة العملاء والحسابات الآجلة' : 'Customer Relationship & Credit Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'نقاط الولاء، حدود الائتمان، وسداد الديون المستحقة' : 'Manage VIP tiers, loyalty point redemption, and store credit debt settlement.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isArabic ? 'بحث بالاسم أو الهاتف...' : 'Search customer or phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? 'عميل جديد' : 'New Customer'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Customer Cards */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{c.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.tier === 'VIP' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      c.tier === 'WHOLESALE' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {c.tier}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{c.email}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-xs bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-800/40">
                    <Award className="w-3.5 h-3.5" />
                    <span>{c.loyaltyPoints} pts</span>
                  </div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div className="bg-slate-950 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400">Store Credit Balance:</span>
                  <div className={`font-bold text-sm mt-0.5 ${(c.creditBalance || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${(c.creditBalance || 0).toFixed(2)}
                  </div>
                  <span className="text-[9px] text-slate-500">Limit: ${(c.creditLimit || 0).toFixed(2)}</span>
                </div>

                <div className="bg-slate-950 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400">Total Lifetime Spend:</span>
                  <div className="font-bold text-sm text-slate-200 mt-0.5">${(c.totalSpend || 0).toFixed(2)}</div>
                  <span className="text-[9px] text-slate-500">{c.totalVisits || 0} store visits</span>
                </div>
              </div>
            </div>

            {/* Actions: Settle Debt */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex justify-end">
              {(c.creditBalance || 0) > 0 ? (
                <button
                  onClick={() => {
                    setSelectedCustomer(c);
                    setSettleAmount((c.creditBalance || 0).toFixed(2));
                    setSettleModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Settle Credit Debt
                </button>
              ) : (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Account in Good Standing
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Settle Debt Modal */}
      {settleModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">Settle Customer Debt</h3>
            <p className="text-xs text-slate-300">Customer: <span className="font-bold text-white">{selectedCustomer.name}</span></p>
            <div className="text-xs text-red-400">Current Outstanding Balance: <span className="font-bold">${(selectedCustomer.creditBalance || 0).toFixed(2)}</span></div>

            <form onSubmit={handleSettleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Settlement Payment Received ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-lg font-bold text-emerald-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl space-y-3">
            <h3 className="font-bold text-sm text-white">Create New Customer Account</h3>

            <form onSubmit={handleCreateCustomer} className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phone Number:</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address (Optional):</label>
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
