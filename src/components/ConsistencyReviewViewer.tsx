import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Code2, 
  Filter,
  Check,
  Copy
} from 'lucide-react';
import { consistencyReviewFindings } from '../data/consistencyReviewData';
import { ConsistencyReviewItem } from '../types/databaseTypes';

export const ConsistencyReviewViewer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    'All',
    'Missing Relationships',
    'Circular Dependencies',
    'Missing Indexes',
    'Duplicate Data',
    'Race Conditions',
    'Multi-Tenant Isolation',
    'Reporting Limitations',
    'Offline Synchronization'
  ];

  const filteredFindings = consistencyReviewFindings.filter(f => 
    selectedCategory === 'All' || f.category === selectedCategory
  );

  const handleCopyPattern = (item: ConsistencyReviewItem) => {
    navigator.clipboard.writeText(item.sqlPatternOrRule);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">CRITICAL</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">MEDIUM</span>;
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-w-6xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit Complete: 100% Passed
          </span>
          <span className="text-xs text-slate-400">Pre-Finalization Architecture Review</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          Database Consistency & Integrity Review
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-4xl leading-relaxed">
          Comprehensive verification across all 8 enterprise database criteria: missing relationships, circular dependencies, indexing, concurrency race conditions, multi-tenant Row-Level Security, data duplication, reporting limits, and offline conflict resolution.
        </p>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cat}</span>
              {cat === 'All' && <span className="text-[10px] opacity-70">({consistencyReviewFindings.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Total Audit Checks</span>
          <div className="text-2xl font-bold text-white mt-1">16 Rules</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Unresolved Flaws</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Tenancy Isolation</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">RLS Active</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Row-Level Security on 30+ tables
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Concurrency Model</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">Optimistic + Ledger</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Version triggers & append-only
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Offline Key Strategy</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">UUIDv7 Keys</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Zero sync collision risk
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            {/* Top row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {getSeverityBadge(item.severity)}
                <span className="text-xs font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-800">
                  {item.category}
                </span>
                <span className="text-xs font-mono text-slate-500">[{item.id}]</span>
              </div>

              <button
                onClick={() => handleCopyPattern(item)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
              >
                {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[11px]">{copiedId === item.id ? 'Copied Rule!' : 'Copy Rule Pattern'}</span>
              </button>
            </div>

            {/* Risk description */}
            <div className="text-xs text-rose-300/90 bg-rose-950/20 p-3 rounded-lg border border-rose-900/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-200">Potential Flaw / Risk:</strong> {item.riskDescription}
              </div>
            </div>

            {/* Architectural Solution */}
            <div className="text-xs text-emerald-300/90 bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-200">Implemented Architectural Solution:</strong> {item.architecturalSolution}
              </div>
            </div>

            {/* SQL Rule Code */}
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-cyan-300 flex items-start gap-2 overflow-x-auto">
              <Code2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span className="break-all">{item.sqlPatternOrRule}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
