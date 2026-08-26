import { SpecSection } from '../types';

export const roadmapSection: SpecSection = {
  id: 'roadmap',
  number: 12,
  title: 'Development Roadmap & Implementation Phases',
  shortTitle: '12. Roadmap',
  badge: 'Project Execution',
  summary: 'Phased implementation blueprint across 6 structured milestones spanning backend domain foundation, mobile offline POS, synchronization engine, hardware integration, and enterprise hardening.',
  subsections: [
    {
      id: 'roadmap-phases',
      title: '12.1 Phased Implementation Matrix',
      content: `The development roadmap is structured into 6 sequential phases over a 24-week execution cycle:`,
      tables: [
        {
          headers: ['Phase & Milestone', 'Duration', 'Key Deliverables & Epics', 'Exit Criteria & Definition of Done'],
          rows: [
            ['Phase 0: Architecture & Foundation (M0)', 'Weeks 1-3', 'PostgreSQL schema with Drizzle, NestJS CQRS core, IAM module (JWT + RBAC), Flutter Clean Arch skeleton + Drift DB setup.', 'Green Testcontainers pipeline, multi-tenant auth verified, local encrypted DB running on Flutter.'],
            ['Phase 1: Catalog & Master Data (M1)', 'Weeks 4-7', 'Product variants, categories, brands, UOM conversion engine, multi-barcode scanner indexing, price list calculation engine.', 'Sub-50ms barcode lookup on 100k local products, accurate multi-unit price calculations.'],
            ['Phase 2: Core POS & Register Shifts (M2)', 'Weeks 8-12', 'Cart aggregate, line-item/basket discounts, tax engine, split payment tenders, shift opening/closing (X/Z reports), PDF receipts.', 'End-to-end checkout flow functional offline; 100% accurate shift cash drawer variance calculation.'],
            ['Phase 3: Offline Sync Engine (M3)', 'Weeks 13-16', 'Outbox mutation queue in Drift, NestJS batch sync endpoint, idempotency gate, LWW conflict resolver, delta pull streaming.', 'Chaos testing verifies 0 duplicate sales across 10,000 offline simulated re-connections.'],
            ['Phase 4: Inventory & Procurement (M4)', 'Weeks 17-20', 'Double-entry stock ledger, Purchase Orders (PO), Goods Received Notes (GRN), inter-store transfers, stock adjustments.', 'Full inventory lifecycle tested: PO creation -> GRN intake -> POS sale -> Stock movement audit.'],
            ['Phase 5: Hardware & Production Hardening (M5)', 'Weeks 21-24', 'ESC/POS Bluetooth/TCP thermal printing, HID scanner integration, cash drawer pulse, load testing, security pen-testing.', 'Hardware verified on physical Sunmi/Zebra/Honeywell POS terminals; sub-200ms p99 API latency under 5k req/s.']
          ]
        }
      ]
    },
    {
      id: 'roadmap-risk-mitigation',
      title: '12.2 Architectural Risk Mitigation Matrix',
      content: `Anticipated engineering risks and proven mitigation strategies:`,
      tables: [
        {
          headers: ['Risk Scenario', 'Severity', 'Likelihood', 'Proactive Mitigation Strategy'],
          rows: [
            ['Concurrent overselling during extended multi-store offline blackout', 'High', 'Medium', 'Double-entry ledger records physical sales as primary truth; back-office dashboard flags negative variance; automated manager replenishment alert.'],
            ['Large catalog sync overwhelming mobile SQLite performance on low-end devices', 'Medium', 'Medium', 'Incremental delta sync with pagination (?since=Seq); binary indexed barcode lookups; background isolate database writes.'],
            ['Thermal printer driver instability across varied BLE/USB hardware vendors', 'High', 'High', 'Standardized ESC/POS command abstraction layer with hardware capability profiles (58mm vs 80mm, raster bitmap fallback).'],
            ['Client clock tampering causing out-of-order timestamp anomalies', 'Medium', 'Low', 'Monotonic client sequence numbers + UUIDv7 ordering paired with server-authoritative arrival timestamps in the immutable ledger.']
          ]
        }
      ]
    }
  ]
};
