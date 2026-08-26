import { SpecSection } from '../types';

export const prdSection: SpecSection = {
  id: 'prd',
  number: 1,
  title: 'Product Requirements Document (PRD)',
  shortTitle: '1. PRD',
  badge: 'Product Strategy',
  summary: 'Defines business objectives, scope, user personas, comprehensive functional requirements, and non-functional service level metrics for a multi-store retail POS & inventory management platform.',
  subsections: [
    {
      id: 'prd-exec-summary',
      title: '1.1 Executive Summary & Target Market',
      content: `The system is an enterprise-grade, offline-first Mobile Point of Sale (mPOS) and Unified Inventory Management System tailored for modern retail, convenience stores, multi-branch specialty boutiques, supermarkets, and franchise networks.

Modern retailers face high vulnerability to connectivity outages, complex inventory tracking across multiple branch stores, slow checkout queues, and fragmented supplier purchasing. This product provides a zero-latency native mobile POS terminal (Android & iOS) coupled with a scalable, modular NestJS backend that operates continuously without internet connectivity, guaranteeing zero lost transactions and deterministic inventory consistency upon cloud re-synchronization.`,
      callouts: [
        {
          type: 'info',
          title: 'Core Business Objective',
          message: 'Achieve sub-50ms barcode scan-to-cart latency, 100% checkout uptime during continuous 72-hour internet blackouts, zero financial transaction duplication, and unified real-time multi-branch stock visibility.'
        }
      ]
    },
    {
      id: 'prd-personas',
      title: '1.2 Stakeholder Personas & User Journeys',
      content: `The system caters to distinct operational roles across the retail hierarchy:`,
      tables: [
        {
          headers: ['Role', 'Key Responsibilities', 'Primary Workflows', 'Pain Points Addressed'],
          rows: [
            ['Cashier / POS Operator', 'Checkout, cash handling, barcode scanning, returns, customer lookup', 'Open shift -> Scan items -> Apply discounts -> Accept split payments -> Print receipt -> Close shift', 'Slow UI lag, scanner failures, offline checkout lockouts, complicated returns'],
            ['Store Manager', 'Shift reconciliation, stock intake (GRN), inventory audits, price overrides, cash float management', 'Review daily register logs -> Approve refund exceptions -> Receive supplier deliveries -> Perform cycle counts', 'Inventory shrinkage, unrecorded cash discrepancies, lost paperwork, stock mismatches'],
            ['Inventory Controller', 'Purchase orders, inter-store stock transfers, supplier management, min/max reorder levels', 'Generate automated POs -> Approve inter-branch transfers -> Monitor stock valuation (FIFO/WAC) -> Manage dead stock', 'Stockouts in high-velocity stores, delayed transfer updates, manual data entry errors'],
            ['Retail Business Owner / Executive', 'Multi-branch profitability analysis, pricing policy, tax compliance, staff performance', 'Access real-time consolidated sales dashboard -> Set global promotions -> Audit financial ledgers -> Export tax reports', 'Lack of real-time consolidated branch metrics, fraud risk, compliance overhead']
          ]
        }
      ]
    },
    {
      id: 'prd-functional-scope',
      title: '1.3 Detailed Functional Scope Matrix',
      content: `The product scope encompasses 12 dedicated functional domains:`,
      tables: [
        {
          headers: ['Functional Domain', 'Included Capabilities', 'Exclusions / Boundaries'],
          rows: [
            ['Catalog & Master Data', 'Hierarchical categories, brands, manufacturers, parent products, matrix variants (size, color, material), multi-barcode mapping (UPC, EAN-13, Code-128, QR), image assets, tags, custom attributes', 'No digital download file hosting (physical goods focus)'],
            ['Units & Conversions', 'Base units (Piece, Kg, Liter, Meter), derived packaging units (Box of 12, Carton of 144, Pallet), fractional decimal quantities (3 decimal places e.g., 1.425 kg), automated conversion factor engine', 'No dynamic formula-based custom manufacturing recipes'],
            ['Pricing & Promotions', 'Base retail price, cost price (FIFO/WAC tracking), customer tier pricing (Retail, Wholesale, VIP), quantity break tiers (1-5, 6-19, 20+), scheduled time-based promotions, bundle discounts, coupon validation', 'No live currency forex bidding (fixed multi-currency rates)'],
            ['Inventory & Stock Movements', 'Double-entry stock movement journal, real-time store-level inventory snapshot, batch/lot tracking with expiration dates, serial number capture, stock adjustments (damaged, lost, found, sample), cycle counts & full physical stocktakes', 'No third-party 3PL freight booking integration in v1'],
            ['Suppliers & Purchasing', 'Supplier directory, purchasing terms, Purchase Orders (PO lifecycle: Draft, Approved, Issued, Partially Received, Completed, Cancelled), Goods Received Notes (GRN) with landed cost allocation', 'No automated reverse EDI invoice factoring in v1'],
            ['Inter-Store Transfers', 'Transfer requests, dispatch confirmation, in-transit stock ledger state, receiving store discrepancy reconciliation (over/short/damaged)', 'No cross-border customs declaration generation'],
            ['Point of Sale Checkout', 'Fast product search & instant camera/HID barcode scanning, held carts (layaway), cart discounts & line item discounts, price overrides (with supervisor PIN), tax inclusive/exclusive toggle, cash change calculator', 'No table/seat mapping (retail focus, not full F&B dine-in)'],
            ['Payments & Fiscal', 'Split payments across multiple tenders (Cash, Credit/Debit Card, Store Credit, Gift Card, Loyalty Points), integrated thermal ESC/POS printing, digital PDF receipt generation, email receipt dispatch', 'Card processing handled via external EMV terminal or gateway'],
            ['Returns & Exchanges', 'Receipted returns (line item verification against original sale), unreceipted returns (with manager override), restocking fee calculation, refund to original tender or store credit issuance', 'No non-inventory goodwill cash gifts without audit log'],
            ['Customers & Loyalty', 'Customer profiles, transaction history, store credit ledger with balance limits, loyalty points earning and redemption rules, customer tax exempt certificates', 'No external credit bureau credit scoring checks'],
            ['Shift & Cash Management', 'Shift opening with cash float declaration, mid-shift pay-in / pay-out (petty cash), X-Report (mid-shift snapshot), Z-Report (end-of-shift closure with cash drawer reconciliation and variance tracking)', 'No direct automated bank armored transport scheduling'],
            ['Offline & Synchronization', '100% offline checkout and cart processing, local outbox mutation queue, automatic background cloud synchronization upon reconnection, idempotent transaction ingestion, vector clock conflict resolution', 'No peer-to-peer ad-hoc device syncing without central server']
          ]
        }
      ]
    },
    {
      id: 'prd-nfr',
      title: '1.4 Non-Functional Requirements (NFRs)',
      content: `The system adheres to rigorous enterprise quality attributes:`,
      tables: [
        {
          headers: ['Metric / Area', 'Target Requirement', 'Measurement Methodology & Verification'],
          rows: [
            ['Scan-to-Cart Latency', '< 50 milliseconds', 'Local SQLite indexed query on 100,000 product variants on mid-range Android device (e.g., Samsung A54)'],
            ['Cart Total Recalculation', '< 10 milliseconds', 'Deterministic pricing engine calculating 50 items with 3 tax rates, 2 promo rules, and VIP discounts'],
            ['Offline Autonomy', 'Indefinite (Tested up to 30 continuous days)', 'Continuous local POS operation with 50,000 cached sales stored in local encrypted Drift database'],
            ['Sync Replay Throughput', '> 1,000 offline mutations / second', 'NestJS bulk batch sync endpoint with PostgreSQL CTE multi-insert transaction processing'],
            ['Zero Transaction Duplication', '100% Guaranteed (0 duplicate sales)', 'UUIDv7 client-generated IDs combined with unique database idempotency key constraints'],
            ['Local Storage Footprint', '< 250 MB for 100,000 SKU catalog', 'Normalized Drift schema with binary barcode index and compressed product cache'],
            ['App Cold Startup Time', '< 1.8 seconds to ready POS screen', 'Flutter deferred initialization and pre-warmed SQLite database connection pool'],
            ['Data Security at Rest', 'AES-256-GCM hardware-backed encryption', 'SQLCipher encrypted database with encryption key stored in Android Keystore / iOS Keychain']
          ]
        }
      ]
    }
  ]
};
