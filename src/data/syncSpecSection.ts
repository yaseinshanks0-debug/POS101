import { SpecSection } from '../types';

export const syncSpecSection: SpecSection = {
  id: 'sync-spec',
  number: 7,
  title: 'Offline Synchronization Specification',
  shortTitle: '7. Offline Sync Engine',
  badge: 'Distributed Systems',
  summary: 'In-depth specification of the offline-first transactional engine, monotonic outbox mutation queue, CRDT / Last-Write-Wins conflict resolution matrix, and high-watermark delta ingestion.',
  subsections: [
    {
      id: 'sync-lifecycle',
      title: '7.1 Seven-Stage Synchronization Protocol',
      content: `When a mobile POS terminal reconnects to the network, the sync client initiates a strict 7-stage deterministic protocol:

\`\`\`
+----------------+          +-------------------+          +--------------------+
|  Mobile Client |          |    API Gateway    |          |   NestJS Sync Engine|
+-------+--------+          +---------+---------+          +---------+----------+
        |                             |                              |
 (1) [Online Detected]                |                              |
        |--- (1) Handshake & Auth --->|                              |
        |    (Refresh JWT if expired) |                              |
        |                             |                              |
 (2) [Read Pending Outbox Mutations]  |                              |
        |--- (2) POST /sync/batch/push ----------------------------->|
        |    (Batch of 100 mutations) |                              |
        |                             |                       (3) [Validate Idempotency]
        |                             |                       (4) [Execute DB Transaction]
        |                             |                       (5) [Apply Conflict Matrix]
        |                             |                       (6) [Commit Server Ledger]
        |                             |                              |
        |<-- (6) Return Batch ACK & High-Watermark Sequence ---------|
        |                             |                              |
 (7) [Mark Outbox Synced & Prune]     |                              |
        |--- (7) GET /sync/delta/pull?since=Seq -------------------->|
        |<-- Return Server Deltas (Catalog, Price changes) ----------|
 (8) [Merge Server Deltas to Local Drift DB]                         |
\`\`\`

### Protocol Stages:
1. **Connectivity Check & Auth Handshake**: Verifies network stability and refreshes expired JWT tokens.
2. **Outbox Batch Extraction**: Reads un-synced mutations ordered chronologically by monotonic sequence number (\`seq_num\`).
3. **Server Idempotency Gate**: Server evaluates \`idempotency_key\` in Redis / PostgreSQL. Duplicate transactions return cached receipts immediately.
4. **Conflict Resolution Matrix**: Server reconciles data based on aggregate classification (Financial transactions vs Master data vs Stock ledger).
5. **Database Transaction Commit**: Atomically executes mutations, inserts stock ledger records, updates projections.
6. **Client Batch ACK**: Client marks outbox entries as \`SYNCED\` and updates its local \`last_synced_at\` timestamp.
7. **Downstream Delta Pull**: Client pulls all catalog, customer, and pricing updates emitted by other terminals since its last high-watermark sequence.`,
      callouts: [
        {
          type: 'critical',
          title: 'Zero Duplicate Sale Guarantee',
          message: 'Even if the network cuts out during the HTTP response stage after the server has committed the sale, the mobile client will retransmit the identical batch on the next retry. The server matches the idempotency_key, detects the existing record, skips duplicate insertion, and returns the 200 OK ACK safely.'
        }
      ]
    },
    {
      id: 'sync-conflict-matrix',
      title: '7.2 Conflict Resolution Matrix & Business Policies',
      content: `Different domain entities require distinct conflict handling strategies to ensure mathematical consistency:`,
      tables: [
        {
          headers: ['Entity / Domain Aggregate', 'Conflict Scenario', 'Resolution Policy & Algorithm', 'Rationale & Fiscal Guarantee'],
          rows: [
            ['Sales Orders', 'Two offline terminals sell items simultaneously with overlapping local serial numbers.', 'Client UUIDv7 + Unique Idempotency Key. Both sales are independently accepted and committed.', 'A completed customer sale is an immutable historical financial event; it must never be rejected or rolled back retroactively.'],
            ['Inventory Stock Ledger', 'Two offline terminals sell the same physical unit when stock = 1 (Stock overselling).', 'Commutative Addition / Subtraction in Append-Only Ledger. Negative balance allowed if stock is physically handed over, logged as shrinkage variance.', 'In retail, physical possession trumps digital state. Cashier handed item to customer; the ledger records physical reality.'],
            ['Customer Credit Account', 'Customer offline charge exceeds credit limit due to concurrent transaction at another branch.', 'Committed to ledger. Customer status flagged as OVER_CREDIT_LIMIT with manager review alert.', 'Prevents checkout deadlock at counter; surfaces account breach to back-office for automated follow-up.'],
            ['Product Master Data & Prices', 'Back-office changes price while POS sells item at previous offline cached price.', 'Server records sale at the historical price locked in the POS cart at transaction time (Sale Snapshot). Catalog master data adopts Last-Write-Wins (LWW).', 'Legal fiscal compliance mandates honoring the price displayed/agreed to at time of consumer payment. Master catalog adopts newest timestamp.'],
            ['Customer Profiles', 'Customer address edited concurrently at POS terminal and web portal.', 'Last-Write-Wins (LWW) based on NTP/GPS synchronized UTC timestamp vector.', 'Non-financial metadata convergence.']
          ]
        }
      ]
    },
    {
      id: 'sync-outbox-schema',
      title: '7.3 Local Outbox Queue Structure (Drift / SQLite)',
      content: `The Drift SQLite table definition powering the offline outbox queue on mobile devices:`,
      codeSnippets: [
        {
          language: 'dart',
          filename: 'lib/core/database/tables/sync_outbox_table.dart',
          code: `import 'package:drift/drift.dart';

@DataClassName('SyncOutboxEntry')
class SyncOutboxTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get mutationId => text().unique()(); // UUIDv7
  TextColumn get entityType => text()(); // 'SALES_ORDER', 'SHIFT_EVENT', 'STOCK_ADJUSTMENT'
  TextColumn get operation => text()(); // 'CREATE', 'UPDATE', 'DELETE'
  TextColumn get idempotencyKey => text()();
  TextColumn get payloadJson => text()();
  DateTimeColumn get occurredAt => dateTime()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('PENDING'))(); // 'PENDING', 'IN_FLIGHT', 'SYNCED', 'FAILED'
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get syncedAt => dateTime().nullable()();
}`
        }
      ]
    }
  ]
};
