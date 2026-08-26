import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Key, 
  Lock, 
  ShieldCheck, 
  Layers, 
  Copy, 
  Check, 
  Info,
  GitBranch
} from 'lucide-react';
import { allPostgresTables } from '../data/postgresSchemaMerged';
import { DetailedPostgresTable } from '../types/databaseTypes';

export const PostgresSchemaCatalog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedTable, setSelectedTable] = useState<DetailedPostgresTable>(allPostgresTables[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const groups = ['All', 'IAM & Tenancy', 'Catalog & UOM', 'Suppliers & Procurement', 'Inventory & Warehousing', 'Sales & POS Registers', 'Customers & Loyalty', 'Sync & Idempotency', 'Audit & Compliance'];

  const filteredTables = allPostgresTables.filter(table => {
    const matchesGroup = selectedGroup === 'All' || table.schemaGroup === selectedGroup;
    const matchesSearch = table.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.businessPurpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.columns.some(col => col.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  const handleCopyDDL = () => {
    let ddl = `-- PostgreSQL DDL for ${selectedTable.tableName}\n`;
    ddl += `CREATE TABLE ${selectedTable.tableName} (\n`;
    const colDefs = selectedTable.columns.map(col => {
      let line = `  ${col.name} ${col.type}`;
      if (col.isPk && selectedTable.primaryKey.includes(col.name)) line += ` PRIMARY KEY`;
      if (col.defaultVal) line += ` DEFAULT ${col.defaultVal}`;
      if (!col.nullable) line += ` NOT NULL`;
      if (col.isUnique) line += ` UNIQUE`;
      return line;
    });
    ddl += colDefs.join(',\n');
    if (selectedTable.foreignKeys.length > 0) {
      ddl += ',\n';
      const fkDefs = selectedTable.foreignKeys.map(fk => 
        `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.references} ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`
      );
      ddl += fkDefs.join(',\n');
    }
    ddl += '\n);\n\n';
    selectedTable.indexes.forEach(idx => {
      ddl += `${idx.definition}\n`;
    });

    navigator.clipboard.writeText(ddl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex bg-slate-950 overflow-hidden">
      {/* Table List Sidebar */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h2 className="font-bold text-sm text-white">PostgreSQL Tables</h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              {filteredTables.length} / {allPostgresTables.length}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search table or column..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Schema Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredTables.map(t => {
            const isSelected = selectedTable.tableName === t.tableName;
            return (
              <button
                key={t.tableName}
                onClick={() => setSelectedTable(t)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-200">{t.tableName}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {t.columns.length} cols
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate">{t.schemaGroup}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Inspector */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {selectedTable.schemaGroup}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                selectedTable.softDeleteStrategy.includes('Strictly Immutable')
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {selectedTable.softDeleteStrategy}
              </span>
            </div>
            <h1 className="text-2xl font-mono font-bold text-white flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-400" />
              {selectedTable.tableName}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {selectedTable.businessPurpose}
            </p>
          </div>

          <button
            onClick={handleCopyDDL}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied DDL!' : 'Copy SQL DDL'}</span>
          </button>
        </div>

        {/* Quick Metadata Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary Key</span>
            <div className="font-mono text-white font-bold mt-1 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              {selectedTable.primaryKey}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Concurrency Control</span>
            <div className="text-white font-semibold mt-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate">{selectedTable.concurrencyControl}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Row-Level Security</span>
            <div className="text-emerald-300 font-mono text-[11px] mt-1 flex items-center gap-1 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{selectedTable.rlsPolicyDefinition}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Relationships</span>
            <div className="text-slate-300 font-semibold mt-1 flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span>{selectedTable.relationships.length} associations</span>
            </div>
          </div>
        </div>

        {/* Columns Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Columns & Data Types ({selectedTable.columns.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Nullable</th>
                  <th className="py-2.5 px-3">Default</th>
                  <th className="py-2.5 px-3">Constraints & Attributes</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {selectedTable.columns.map(c => (
                  <tr key={c.name} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      {c.isPk && <Key className="w-3 h-3 text-amber-400" />}
                      {c.isFk && <span className="text-[9px] px-1 rounded bg-purple-900/60 text-purple-300 border border-purple-800">FK</span>}
                      <span>{c.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-indigo-300">{c.type}</td>
                    <td className="py-2.5 px-3">
                      {c.nullable ? (
                        <span className="text-slate-400">NULL</span>
                      ) : (
                        <span className="text-rose-400 font-semibold">NOT NULL</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{c.defaultVal || '-'}</td>
                    <td className="py-2.5 px-3">
                      {c.isUnique && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800 mr-1">UNIQUE</span>}
                      {c.checkConstraint && <span className="text-[10px] text-amber-300">{c.checkConstraint}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Foreign Keys & Indexes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Foreign Keys */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              Foreign Key References ({selectedTable.foreignKeys.length})
            </h4>
            {selectedTable.foreignKeys.length === 0 ? (
              <p className="text-slate-400 text-[11px]">No outbound foreign key constraints.</p>
            ) : (
              <div className="space-y-2">
                {selectedTable.foreignKeys.map((fk, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px]">
                    <div className="text-indigo-300 font-semibold">({fk.column}) → {fk.references}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">ON DELETE {fk.onDelete} | ON UPDATE {fk.onUpdate}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indexes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Indexes & Performance Optimization ({selectedTable.indexes.length})
            </h4>
            {selectedTable.indexes.length === 0 ? (
              <p className="text-slate-400 text-[11px]">Primary key index only.</p>
            ) : (
              <div className="space-y-2">
                {selectedTable.indexes.map((idx, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="font-mono text-[11px] text-cyan-300 font-bold">{idx.name}</div>
                    <div className="font-mono text-[10px] text-slate-400 break-all">{idx.definition}</div>
                    <div className="text-[11px] text-slate-300 font-sans flex items-center gap-1 text-xs">
                      <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span>{idx.purpose}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
