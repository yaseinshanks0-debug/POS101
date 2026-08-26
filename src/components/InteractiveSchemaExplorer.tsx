import React, { useState } from 'react';
import { DbTable } from '../types';
import { allDbTables } from '../data/specData';
import { 
  Database, 
  Key, 
  Link, 
  Search, 
  Shield, 
  Layers, 
  FileSpreadsheet, 
  Hash,
  Check,
  Copy
} from 'lucide-react';

export const InteractiveSchemaExplorer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTable, setSearchTable] = useState<string>('');
  const [activeTable, setActiveTable] = useState<DbTable>(allDbTables[0]);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const categories = ['All', 'Core & Auth', 'Catalog & Pricing', 'Inventory & Purchasing', 'Sales & POS', 'Customers & Loyalty', 'Sync & Audit'];

  const filteredTables = allDbTables.filter(t => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = !searchTable || 
      t.name.toLowerCase().includes(searchTable.toLowerCase()) ||
      t.purpose.toLowerCase().includes(searchTable.toLowerCase()) ||
      t.columns.some(c => c.name.toLowerCase().includes(searchTable.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const generateDrizzleCode = (table: DbTable) => {
    return `// Drizzle ORM Schema Definition for: ${table.name}
export const ${table.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())} = pgTable('${table.name}', {
${table.columns.map(c => {
  let line = `  ${c.name}: `;
  if (c.type.startsWith('UUID')) line += `uuid('${c.name}')`;
  else if (c.type.startsWith('VARCHAR')) {
    const len = c.type.match(/\d+/)?.[0] || '255';
    line += `varchar('${c.name}', { length: ${len} })`;
  }
  else if (c.type.startsWith('NUMERIC')) line += `numeric('${c.name}', { precision: 14, scale: 4 })`;
  else if (c.type.startsWith('BOOLEAN')) line += `boolean('${c.name}')`;
  else if (c.type.startsWith('TIMESTAMPTZ')) line += `timestamp('${c.name}', { withTimezone: true })`;
  else if (c.type.startsWith('JSONB')) line += `jsonb('${c.name}')`;
  else if (c.type.startsWith('TEXT')) line += `text('${c.name}')`;
  else line += `text('${c.name}')`;

  if (c.isPk) line += '.primaryKey()';
  if (!c.nullable) line += '.notNull()';
  if (c.defaultVal) line += `.default(${c.defaultVal})`;
  if (c.isFk && c.fkTarget) line += `.references(() => ${c.fkTarget.split('.')[0]}.id)`;
  return line + ',';
}).join('\n')}
});`;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateDrizzleCode(activeTable));
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-w-7xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PostgreSQL & Drizzle ORM
              </span>
              <span className="text-xs text-slate-400">Total Entities: {allDbTables.length}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Database className="w-7 h-7 text-indigo-400" />
              Relational Database Schema Explorer
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Inspect database tables, column types, composite keys, indexing policies, foreign constraints, and audit strategies.
            </p>
          </div>

          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Drizzle Definition</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mt-6 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Table List, Right Table Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              placeholder="Search tables or columns..."
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
            {filteredTables.map(t => {
              const isSelected = activeTable.name === t.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setActiveTable(t)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between gap-2 text-xs ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-slate-200">{t.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.purpose}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0 font-mono">
                    {t.columns.length} cols
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Table Inspection (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-400 mr-2">
                  {activeTable.category}
                </span>
                <span className="font-mono font-bold text-lg text-white">
                  {activeTable.name}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                PK: <span className="text-amber-400 font-bold">{activeTable.primaryKey}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-6 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              {activeTable.purpose}
            </p>

            {/* Column Schema Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800 mb-6">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-200 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Column Name</th>
                    <th className="px-3 py-2.5">Data Type</th>
                    <th className="px-3 py-2.5">Nullable</th>
                    <th className="px-3 py-2.5">Default / Constraints</th>
                    <th className="px-3 py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeTable.columns.map((c, cIdx) => (
                    <tr key={cIdx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                        {c.isPk && <Key className="w-3 h-3 text-amber-400" title="Primary Key" />}
                        {c.isFk && <Link className="w-3 h-3 text-cyan-400" title="Foreign Key" />}
                        <span>{c.name}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-indigo-300">{c.type}</td>
                      <td className="px-3 py-2">
                        {c.nullable ? (
                          <span className="text-slate-500">NULL</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">NOT NULL</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                        {c.defaultVal || (c.fkTarget ? `-> ${c.fkTarget}` : '-')}
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-[11px]">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Indexes & Relational Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Indexes & Performance
                </h4>
                <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                  {activeTable.indexes.map((idx, i) => (
                    <li key={i} className="truncate" title={idx}>• {idx}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Soft Delete & Audit Strategy
                </h4>
                <p className="text-[11px] text-slate-400 mb-1">
                  <span className="font-semibold text-slate-300">Strategy:</span> {activeTable.softDelete}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  <span className="font-semibold text-slate-300">Audit Columns:</span> {activeTable.auditFields}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
