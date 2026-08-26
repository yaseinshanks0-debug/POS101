import React, { useState } from 'react';
import { 
  Layers, 
  Database, 
  Smartphone, 
  Server, 
  ShieldCheck, 
  Cpu, 
  RefreshCw, 
  ArrowRight,
  GitBranch
} from 'lucide-react';

export const ArchitectureDiagramViewer: React.FC = () => {
  const [selectedDiagram, setSelectedDiagram] = useState<'clean' | 'c4' | 'cqrs'>('clean');

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-w-6xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            System Diagrams & Visuals
          </span>
          <span className="text-xs text-slate-400">Enterprise C4 & DDD Models</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Layers className="w-7 h-7 text-indigo-400" />
          System Architecture Visualizer
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Interactive structural diagrams depicting Clean Architecture layers, C4 runtime containers, and CQRS message buses.
        </p>

        {/* Diagram Selector Tabs */}
        <div className="flex items-center gap-2 mt-6">
          <button
            onClick={() => setSelectedDiagram('clean')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedDiagram === 'clean'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Clean Architecture Layers</span>
          </button>
          <button
            onClick={() => setSelectedDiagram('c4')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedDiagram === 'c4'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>C4 Container Topology</span>
          </button>
          <button
            onClick={() => setSelectedDiagram('cqrs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              selectedDiagram === 'cqrs'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>CQRS & Event Bus Flow</span>
          </button>
        </div>
      </div>

      {/* DIAGRAM 1: Clean Architecture Layers */}
      {selectedDiagram === 'clean' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Concentric Clean Architecture Ring (Mobile & Backend)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              
              {/* Domain Layer */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/50 text-indigo-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-900 text-indigo-300">
                    Layer 1 (Core)
                  </span>
                  <h4 className="font-bold text-base text-white mt-2 mb-1">Domain Layer</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Zero dependencies. Pure business entities, Aggregates, Value Objects, Domain Events, Invariants, and Repository Contracts.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] bg-slate-950 p-2 rounded text-indigo-300 border border-indigo-900/50">
                  • SalesOrder<br />
                  • Money (Value Object)<br />
                  • StockMovementFactory
                </div>
              </div>

              {/* Application Layer */}
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 text-blue-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-900 text-blue-300">
                    Layer 2
                  </span>
                  <h4 className="font-bold text-base text-white mt-2 mb-1">Application Layer</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Coordinates domain models. Contains CQRS Command/Query Handlers, Use Cases, DTOs, and Mapper mappers.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] bg-slate-950 p-2 rounded text-blue-300 border border-blue-900/50">
                  • ProcessCheckoutUseCase<br />
                  • CompleteSaleCommandHandler<br />
                  • SyncEngineService
                </div>
              </div>

              {/* Infrastructure Layer */}
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/50 text-purple-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-900 text-purple-300">
                    Layer 3
                  </span>
                  <h4 className="font-bold text-base text-white mt-2 mb-1">Infrastructure</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    External systems & drivers. Concrete Drift SQLite/Drizzle PostgreSQL repositories, ESC/POS printer drivers, Dio network clients.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] bg-slate-950 p-2 rounded text-purple-300 border border-purple-900/50">
                  • DriftSalesOrderRepo<br />
                  • EscPosBluetoothDriver<br />
                  • DrizzlePostgresRepo
                </div>
              </div>

              {/* Presentation Layer */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-900 text-emerald-300">
                    Layer 4 (Outermost)
                  </span>
                  <h4 className="font-bold text-base text-white mt-2 mb-1">Presentation & API</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    User interface & controllers. Flutter Riverpod widgets, Material 3 POS screens, NestJS REST Controllers, Swagger docs.
                  </p>
                </div>
                <div className="mt-4 font-mono text-[10px] bg-slate-950 p-2 rounded text-emerald-300 border border-emerald-900/50">
                  • PosScreen (Flutter)<br />
                  • CartNotifier (Riverpod)<br />
                  • SalesController (NestJS)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIAGRAM 2: C4 Container Topology */}
      {selectedDiagram === 'c4' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            C4 Container Architecture & Multi-Store Network Topology
          </h3>

          <div className="space-y-4 text-xs">
            {/* Tier 1: Client Devices */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Flutter Mobile & Tablet POS Terminals (Branch Stores)</h4>
                  <p className="text-slate-400 text-[11px]">Android / iOS / Windows Terminals with local encrypted Drift SQLite and offline outbox queues.</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                HTTPS / JSON Sync Batches
              </span>
            </div>

            {/* In-between connection */}
            <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-indigo-400 rotate-90" /></div>

            {/* Tier 2: Edge & Load Balancer */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Cloudflare Edge WAF & Application Load Balancer</h4>
                  <p className="text-slate-400 text-[11px]">DDoS mitigation, TLS termination, API rate limiting, and geographic routing.</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                Internal VPC Mesh
              </span>
            </div>

            {/* In-between connection */}
            <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-indigo-400 rotate-90" /></div>

            {/* Tier 3: NestJS Cluster */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">NestJS Microservices / Modular Monolith Cluster</h4>
                  <p className="text-slate-400 text-[11px]">Auth, Catalog & Pricing, Sales, Stock Movement Ledger, Offline Batch Sync Engine.</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                PgBouncer + Redis Mesh
              </span>
            </div>

            {/* In-between connection */}
            <div className="flex justify-center"><ArrowRight className="w-4 h-4 text-indigo-400 rotate-90" /></div>

            {/* Tier 4: Data Layer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>PostgreSQL Cluster</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Primary HA (Multi-AZ) with Read Replicas, Drizzle ORM, and Row-Level Security.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <RefreshCw className="w-4 h-4 text-rose-400" />
                  <span>Redis Sentinel Cluster</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Distributed locks (Redlock), token revocation blacklists, and fast price caching.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span>Object Storage (S3 / GCS)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Rendered PDF fiscal receipts, catalog images, and database WAL backups.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIAGRAM 3: CQRS Flow */}
      {selectedDiagram === 'cqrs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            CQRS Command & Query Responsibility Segregation Pipeline
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Write Side (Commands) */}
            <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                Write Pipeline (State Mutations)
              </span>
              <h4 className="font-bold text-base text-white">Command Execution Pipeline</h4>
              <ol className="space-y-2 text-[11px] text-slate-300 list-decimal pl-4 leading-relaxed">
                <li>POS Client dispatches <code className="text-amber-300 font-mono">CompleteSaleCommand</code>.</li>
                <li>NestJS CommandBus routes to <code className="text-amber-300 font-mono">CompleteSaleHandler</code>.</li>
                <li>Handler loads <code className="text-indigo-300 font-mono">SalesOrderAggregate</code> and verifies domain invariants.</li>
                <li>Atomic PostgreSQL transaction writes sales record & appends to <code className="text-indigo-300 font-mono">inventory_ledgers</code>.</li>
                <li>Emits <code className="text-emerald-300 font-mono">SaleCompletedEvent</code> on the internal EventBus.</li>
              </ol>
            </div>

            {/* Read Side (Queries) */}
            <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Read Pipeline (High-Speed Queries)
              </span>
              <h4 className="font-bold text-base text-white">Query Projection Pipeline</h4>
              <ol className="space-y-2 text-[11px] text-slate-300 list-decimal pl-4 leading-relaxed">
                <li>POS/Management dashboard dispatches <code className="text-cyan-300 font-mono">GetStoreSalesSummaryQuery</code>.</li>
                <li>NestJS QueryBus routes to read-optimized projection service.</li>
                <li>Direct Drizzle SQL query targets PostgreSQL Read Replica / Materialized View.</li>
                <li>Bypasses domain model reconstruction for zero-allocation performance.</li>
                <li>Returns structured DTO within &lt; 15ms.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
