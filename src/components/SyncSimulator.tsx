import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Server, 
  Smartphone, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  Database,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const SyncSimulator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [simulatedSalesCount, setSimulatedSalesCount] = useState<number>(3);
  const [conflictType, setConflictType] = useState<'none' | 'oversell' | 'price-change' | 'duplicate-retry'>('none');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const steps = [
    {
      title: 'Step 1: Offline Cart Finalization',
      actor: 'Mobile POS Client',
      desc: 'Sales transactions are completed locally. UUIDv7 ID and Idempotency Key are generated, order is committed to encrypted Drift SQLite, and mutation is pushed to SyncOutboxTable (status: PENDING).',
      code: `// Mobile Local DB State
await driftDb.salesOrders.insertOne(order);
await driftDb.syncOutbox.insertOne({
  mutationId: '018db505-88ab-71c2-90ab-123456789abd',
  entityType: 'SALES_ORDER',
  idempotencyKey: 'pos01-ord-10294',
  status: 'PENDING'
});`
    },
    {
      title: 'Step 2: Connectivity Detection & JWT Handshake',
      actor: 'Sync Engine Client',
      desc: 'Network monitoring service detects stable connectivity. It silently checks access token expiration and refreshes the token via /api/v1/auth/refresh if needed.',
      code: `// Network Reconnect Event
if (await networkMonitor.isOnline()) {
  await authService.ensureValidAccessToken();
  syncWorker.triggerBatchPush();
}`
    },
    {
      title: 'Step 3: Bulk Outbox Batch Push',
      actor: 'Mobile -> API Gateway',
      desc: `Mobile client reads up to 100 PENDING mutations ordered by sequence number and submits POST /api/v1/sync/batch/push. Outbox status becomes IN_FLIGHT.`,
      code: `POST /api/v1/sync/batch/push
Headers: { Authorization: 'Bearer eyJhbG...', Idempotency-Key: 'batch-018db...' }
Payload: { mutations: [ ${simulatedSalesCount} queued sales records ] }`
    },
    {
      title: 'Step 4: Server Idempotency & Distributed Lock',
      actor: 'NestJS Sync Engine (Redis)',
      desc: 'Server evaluates idempotency keys against Redis/PostgreSQL. If a retry is detected, previously computed responses are returned immediately without reprocessing.',
      code: `const exists = await redis.get(\`idempotency:\${mutation.idempotencyKey}\`);
if (exists) {
  return JSON.parse(exists); // Zero double-charging or double inventory deductions
}`
    },
    {
      title: 'Step 5: Conflict Resolution & Ledger Insertion',
      actor: 'NestJS Domain Service (PostgreSQL)',
      desc: `Server applies domain resolution rules:
• Sale orders: 100% accepted (legal fiscal record).
• Inventory movements: Appended commutatively to immutable inventory_ledgers.
• Conflict Policy: ${conflictType === 'oversell' ? 'Overselling logged -> Negative physical variance alert generated.' : conflictType === 'price-change' ? 'Historical POS price honored -> Price divergence logged.' : 'Normal sequential commit.'}`,
      code: `await db.transaction(async (tx) => {
  await tx.insert(salesOrders).values(saleDto);
  await tx.insert(inventoryLedgers).values(stockMovement);
  await tx.insert(syncCheckpoints).values({ deviceId, sequence: serverSeq });
});`
    },
    {
      title: 'Step 6: Server ACK & Client Outbox Pruning',
      actor: 'NestJS -> Mobile POS',
      desc: 'Server returns HTTP 200 with synced mutation IDs and latest server watermark sequence. Mobile Drift DB updates outbox entries to status: SYNCED and updates sync timestamp.',
      code: `// Mobile Client Response Handling
await driftDb.syncOutbox
  .update()
  .where((t) => t.mutationId.isIn(syncedIds))
  .write(SyncOutboxCompanion(status: Value('SYNCED'), syncedAt: Value(DateTime.now())));`
    },
    {
      title: 'Step 7: Downstream Catalog & Price Delta Pull',
      actor: 'Mobile POS Client',
      desc: 'Mobile client requests /api/v1/sync/delta/pull?since=ServerSeq to fetch new products, price changes, or promotions updated in the cloud while the terminal was offline.',
      code: `GET /api/v1/sync/delta/pull?since=10452
// Ingest catalog delta into local SQLite cache without interrupting POS checkout UI`
    }
  ];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsOnline(false);
  };

  const handleRunFullSimulation = async () => {
    setIsExecuting(true);
    setIsOnline(false);
    setCurrentStep(0);
    
    await new Promise(r => setTimeout(r, 800));
    setIsOnline(true);
    setCurrentStep(1);

    for (let i = 2; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 1200));
      setCurrentStep(i);
    }
    setIsExecuting(false);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-w-6xl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Interactive Distributed Systems Simulator
          </span>
          <span className="text-xs text-slate-400">Offline-First Architecture</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <RefreshCw className="w-7 h-7 text-indigo-400" />
          Offline Synchronization & Conflict Engine Simulator
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Simulate real-world POS offline scenarios, outbox transaction queuing, network drops, server idempotency locks, and multi-branch ledger reconciliation.
        </p>
      </div>

      {/* Simulator Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Network Switch */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Terminal Link:</span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition ${
                isOnline 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-rose-600 text-white'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online (Connected)' : 'Offline (Air-Gapped)'}</span>
            </button>
          </div>

          {/* Pending Sales Count */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-400">Queued Sales:</span>
            <select
              value={simulatedSalesCount}
              onChange={(e) => setSimulatedSalesCount(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
            >
              <option value={1}>1 Sale Order</option>
              <option value={5}>5 Sale Orders</option>
              <option value={50}>50 Bulk Sales</option>
            </select>
          </div>

          {/* Conflict Scenario */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
            <span className="text-slate-400">Edge Case:</span>
            <select
              value={conflictType}
              onChange={(e) => setConflictType(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
            >
              <option value="none">Standard Smooth Sync</option>
              <option value="oversell">Multi-Terminal Oversell (Stock &lt; 0)</option>
              <option value="price-change">Concurrent Cloud Price Update</option>
              <option value="duplicate-retry">Network Drop on ACK (Duplicate Replay)</option>
            </select>
          </div>
        </div>

        {/* Execution Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunFullSimulation}
            disabled={isExecuting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Auto Run Lifecycle</span>
          </button>
          <button
            onClick={handleReset}
            disabled={isExecuting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 7-Step Interactive Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
        {steps.map((s, idx) => {
          const isDone = currentStep > idx;
          const isCurrent = currentStep === idx;

          return (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`p-2.5 rounded-xl border text-left transition ${
                isCurrent
                  ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                  : isDone
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold">STAGE {idx + 1}</span>
                {isDone ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                ) : (
                  <Clock className="w-3 h-3 text-slate-600" />
                )}
              </div>
              <div className="text-[11px] font-semibold truncate">
                {s.title.split(':')[1] || s.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Deep Dive Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 flex-wrap gap-2">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mr-2">
              Actor: {steps[currentStep].actor}
            </span>
            <h2 className="text-lg md:text-xl font-bold text-white mt-1">
              {steps[currentStep].title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded text-xs"
            >
              Previous
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStep === steps.length - 1}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded text-xs font-semibold"
            >
              Next Step
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {steps[currentStep].desc}
        </p>

        {/* Code representation */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-300 overflow-x-auto">
          <pre>{steps[currentStep].code}</pre>
        </div>
      </div>

      {/* Conflict Resolution Summary Banner */}
      {conflictType !== 'none' && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold mb-1">
              Active Conflict Resolution Policy: {conflictType.toUpperCase()}
            </strong>
            {conflictType === 'oversell' && (
              <p>
                In retail, physical goods handed to a customer cannot be revoked by a database error. The server commits the sale, records negative inventory in <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">inventory_ledgers</code>, and automatically notifies the branch manager of stock shrinkage.
              </p>
            )}
            {conflictType === 'price-change' && (
              <p>
                Consumer protection laws mandate honoring the price displayed at the POS register during checkout. The completed sales order retains the offline snapshot price, while the master catalog adopts the cloud price via Last-Write-Wins.
              </p>
            )}
            {conflictType === 'duplicate-retry' && (
              <p>
                When a client retransmits a batch due to an unacknowledged HTTP connection, the Redis/Postgres idempotency key matches. The server immediately returns the previously committed receipt with zero duplicated ledger rows.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
