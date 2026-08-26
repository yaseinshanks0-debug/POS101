import React from 'react';
import { 
  FileText, 
  Database, 
  RefreshCw, 
  Calculator, 
  Layers, 
  Search, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone 
} from 'lucide-react';

export type NavigationTab = 'flutter-pos' | 'backend-modules' | 'spec' | 'pg-catalog' | 'pg-migrations' | 'pg-review' | 'schema' | 'sync-sim' | 'pricing-sim' | 'diagrams';

interface HeaderProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onExportMarkdown: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onExportMarkdown
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3 min-w-max">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">OmniPOS & Inventory</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  Architecture Blueprint
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Production-Grade Mobile POS & Inventory System Specification</p>
            </div>
          </div>

          {/* Global Search Input */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 12 specification sections, schemas, APIs..."
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExportMarkdown}
              id="export-markdown-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition shadow-sm"
              title="Download Master Markdown Specification"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Export Master Spec</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/50 border border-emerald-800/40 rounded-lg text-emerald-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Production Ready</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('flutter-pos')}
            className={`px-3.5 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
              activeTab === 'flutter-pos'
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 font-extrabold'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/80 bg-emerald-950/40 border border-emerald-800/40'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 Flutter Mobile POS (Interactive Terminal)</span>
          </button>

          <button
            onClick={() => setActiveTab('backend-modules')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backend-modules'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/50'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60 bg-emerald-950/30 border border-emerald-800/30'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Backend Modules (24 Modules)</span>
          </button>

          <button
            onClick={() => setActiveTab('spec')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'spec'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Master Spec (12 Deliverables)</span>
          </button>

          <button
            onClick={() => setActiveTab('pg-catalog')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pg-catalog'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>PostgreSQL Table Catalog (30+ Tables)</span>
          </button>

          <button
            onClick={() => setActiveTab('pg-migrations')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pg-migrations'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Migration Plan (9 SQL Scripts)</span>
          </button>

          <button
            onClick={() => setActiveTab('pg-review')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pg-review'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Consistency & Integrity Review</span>
          </button>

          <button
            onClick={() => setActiveTab('sync-sim')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sync-sim'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing-sim')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pricing-sim'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Pricing Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('diagrams')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'diagrams'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>C4 Diagrams</span>
          </button>
        </div>
      </div>
    </header>
  );
};
