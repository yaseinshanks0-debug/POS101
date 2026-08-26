import { SpecSection } from '../types';

export const testingStrategySection: SpecSection = {
  id: 'testing-strategy',
  number: 9,
  title: 'Testing Strategy & Quality Assurance',
  shortTitle: '9. Testing Strategy',
  badge: 'Quality Assurance',
  summary: 'Comprehensive testing strategy encompassing Unit testing, NestJS Testcontainers integration, Flutter widget/integration testing, Sync Chaos testing, and automated performance benchmarking.',
  subsections: [
    {
      id: 'test-pyramid',
      title: '9.1 Testing Pyramid & Coverage Targets',
      content: `The QA strategy enforces strict code coverage and automated verification gates:`,
      tables: [
        {
          headers: ['Test Tier', 'Target Coverage', 'Scope & Tooling', 'Execution Trigger'],
          rows: [
            ['Domain & Unit Tests', '> 95% line coverage', 'Pure business rules, pricing pipeline, money math, tax calculations, state transitions. Jest (Backend), Dart test (Mobile).', 'Every Git commit (< 30s execution)'],
            ['Application & Use Case Tests', '> 90% branch coverage', 'Command/Query handlers, Mocked repositories, Outbox enqueueing. NestJS TestingModule, Mockito.', 'Every Pull Request (< 2 min)'],
            ['Database & Repository Integration', '> 85% coverage', 'Real PostgreSQL + Drizzle ORM queries, constraints, RLS policies, indexing verification using Testcontainers.', 'PR Build Gate (< 5 min)'],
            ['Sync Chaos & Network Simulation', '100% critical paths', 'Simulated packet loss, sudden offline disconnects during HTTP writes, duplicate outbox replays, split-brain scenarios.', 'Nightly CI build'],
            ['Flutter Hardware Emulation', 'Critical device paths', 'Virtual ESC/POS printer byte stream parser verification, HID barcode keystroke stream simulators.', 'Release candidate verification'],
            ['End-to-End (E2E) POS Flows', 'Core 15 user journeys', 'Patrol / Maestro automated mobile UI tests (Cart -> Scanner -> Payment -> Receipt -> Sync).', 'Staging deployment gate']
          ]
        }
      ]
    },
    {
      id: 'test-chaos-sync',
      title: '9.2 Sync Chaos Testing & Split-Brain Simulations',
      content: `Specialized automated chaos testing scenarios validate the offline synchronization engine under extreme conditions:

1. **Mid-Flight Drop Test**:
   - Client sends 100 offline sales; network drops exactly after backend commits transaction but before returning HTTP 200.
   - **Verification**: Re-transmission on reconnect matches \`idempotency_key\`; backend returns ACK; zero duplicate sales or double inventory reductions.
2. **Concurrent Multi-Terminal Inventory Depletion**:
   - 5 offline terminals each sell 10 units of an item with only 15 units in stock.
   - **Verification**: Upon sync, all 50 sales are accepted and fiscal revenue recorded; inventory ledger reflects -35 units with automated shrinkage notification.
3. **Clock Skew Test**:
   - Terminal local clock set 30 days in the past or 5 hours in the future.
   - **Verification**: Client UTC timestamp captured in \`occurred_at\`, server records physical \`created_at\`, monotonically sequenced.`,
      codeSnippets: [
        {
          language: 'typescript',
          filename: 'sync-chaos.spec.ts',
          code: `describe('Sync Engine Chaos Scenarios', () => {
  it('should guarantee zero duplicate sales on retransmitted outbox batches', async () => {
    const batch = generateMockSyncBatch(50); // 50 sales with UUIDv7
    
    // First transmission: Simulates success on server, network drop on client
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/sync/batch/push')
      .set('Authorization', cashierToken)
      .send(batch);
    expect(res1.status).toBe(200);

    // Check inventory reduced
    const initialLedgerCount = await db.select().from(inventoryLedgers);

    // Second transmission: Client re-sends exact same batch
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/sync/batch/push')
      .set('Authorization', cashierToken)
      .send(batch);
    expect(res2.status).toBe(200);

    // Verify no duplicate ledger entries or sales created
    const postRetryLedgerCount = await db.select().from(inventoryLedgers);
    expect(postRetryLedgerCount.length).toBe(initialLedgerCount.length);
  });
});`
        }
      ]
    }
  ]
};
