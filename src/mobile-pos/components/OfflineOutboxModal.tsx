import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  X, 
  Database, 
  Layers, 
  Send, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { OutboxMutation } from '../types';

interface OfflineOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  outboxMutations: OutboxMutation[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  isArabic: boolean;
}

export const OfflineOutboxModal: React.FC<OfflineOutboxModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onToggleOnline,
  outboxMutations,
  onTriggerSync,
  isSyncing,
  isArabic,
}) => {
  const [selectedMutation, setSelectedMutation] = useState<OutboxMutation | null>(null);

  if (!isOpen) return null;

  const pendingCount = outboxMutations.filter(m => m.status === 'PENDING').length;
  const syncedCount = outboxMutations.filter(m => m.status === 'SYNCED').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isArabic ? 'محرك المزامنة وصندوق العمليات دون اتصال (SQLite Outbox)' : 'SQLite Outbox Queue & Sync Engine'}
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic ? 'معالجة العمليات بنمط Idempotent لضمان عدم تكرار المبيعات' : 'Idempotent, transactional offline mutations guaranteed with SQLite.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network Toggle Banner */}
        <div className="p-4 bg-slate-850 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleOnline}
              className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition ${
                isOnline 
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                  : 'bg-red-950/60 border-red-700 text-red-300'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
              <span>{isOnline ? 'Online (Connected to Backend API)' : 'Offline (Simulating No Internet)'}</span>
            </button>

            <span className="text-xs text-slate-400">
              {pendingCount} pending • {syncedCount} synced
            </span>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={isSyncing || !isOnline}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-cyan-950/40"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing Outbox...' : 'Sync Pending Mutations'}</span>
          </button>
        </div>

        {/* Mutation Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {outboxMutations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No mutations in local SQLite outbox queue.
            </div>
          ) : (
            outboxMutations.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMutation(m)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                  selectedMutation?.id === m.id
                    ? 'bg-slate-800 border-cyan-500 ring-1 ring-cyan-500'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg font-mono text-[10px] font-bold ${
                    m.status === 'SYNCED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {m.status}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{m.entityType}: {m.action}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Key: {m.idempotencyKey.substring(0, 18)}...
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className="text-[10px] text-slate-500">Retries: {m.retryCount}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Mutation Payload Viewer */}
        {selectedMutation && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-cyan-400">JSON Payload (Idempotent SQLite Record):</span>
              <button onClick={() => setSelectedMutation(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36">
              {JSON.stringify(selectedMutation.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
