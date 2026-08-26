import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Terminal, 
  ChevronRight, 
  Layers, 
  Play
} from 'lucide-react';
import { postgresMigrations } from '../data/postgresMigrationsData';

export const PostgresMigrationsViewer: React.FC = () => {
  const [selectedMigrationId, setSelectedMigrationId] = useState<string>(postgresMigrations[0].id);
  const [copied, setCopied] = useState<boolean>(false);

  const currentMigration = postgresMigrations.find(m => m.id === selectedMigrationId) || postgresMigrations[0];

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(currentMigration.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAllMigrations = () => {
    const combined = postgresMigrations.map(m => `-- File: ${m.filename}\n${m.sql}\n\n`).join('\n-- ============================================================================\n\n');
    navigator.clipboard.writeText(combined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex bg-slate-950 overflow-hidden">
      {/* Migration Script Sidebar */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-4 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-sm text-white">Migration Sequence</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              9 Files
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Ordered, idempotent PostgreSQL DDL migration files ready for Flyway, Liquibase, or Drizzle Kit.
          </p>

          <button
            onClick={handleCopyAllMigrations}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All 9 Migrations</span>
          </button>
        </div>

        {/* Scrollable File List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {postgresMigrations.map((m) => {
            const isSelected = selectedMigrationId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMigrationId(m.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono shrink-0 font-bold ${
                  isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {m.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-semibold text-slate-200 truncate">{m.filename}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{m.category}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Migration Content & Code View */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Step {currentMigration.order} of 9
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{currentMigration.category}</span>
            </div>
            <h1 className="text-xl font-mono font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-400" />
              {currentMigration.filename}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              {currentMigration.description}
            </p>
          </div>

          <button
            onClick={handleCopyCurrent}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL!' : 'Copy Migration SQL'}</span>
          </button>
        </div>

        {/* SQL Code Block */}
        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col shadow-xl">
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-400 ml-2">PostgreSQL 16+ DDL Script</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{currentMigration.sql.split('\n').length} lines</span>
          </div>

          <div className="flex-1 p-4 overflow-auto bg-slate-950 font-mono text-xs text-emerald-300/90 leading-relaxed whitespace-pre selection:bg-emerald-500 selection:text-black">
            {currentMigration.sql}
          </div>
        </div>

        {/* Execution Guidance */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white">Execution Command (psql CLI)</h4>
              <p className="text-slate-400 text-[11px] font-mono">
                psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f migrations/{currentMigration.filename}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              Transactional DDL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
