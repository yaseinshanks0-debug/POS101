import { SpecSection } from '../types';

export const systemArchSection: SpecSection = {
  id: 'system-arch',
  number: 2,
  title: 'System Architecture Document',
  shortTitle: '2. System Architecture',
  badge: 'Architecture & Design',
  summary: 'Architectural blueprint employing Clean Architecture, Domain-Driven Design (DDD), Command Query Responsibility Segregation (CQRS), Repository Pattern, and Outbox Sync Pattern.',
  subsections: [
    {
      id: 'arch-principles',
      title: '2.1 Architectural Paradigms & Clean Architecture Model',
      content: `The entire platform—spanning the mobile application and the NestJS backend service—is structured according to Robert C. Martin's Clean Architecture and Eric Evans' Domain-Driven Design principles.

### The Dependency Rule
Dependencies strictly point inwards. Outer layers (Presentation, Infrastructure, Web APIs, Databases) depend on inner abstraction layers (Application, Domain). The Domain Layer contains zero third-party dependencies, zero framework references, and pure business domain entities and value objects.

### Layer Responsibilities

1. **Domain Layer (Innermost)**:
   - Contains Enterprise Business Rules, Entities, Value Objects, Domain Events, Domain Exceptions, and pure Repository Interfaces.
   - Completely agnostic to Flutter/NestJS/SQL/HTTP.
2. **Application Layer**:
   - Implements Use Cases / Interactors, Command & Query Handlers (CQRS), DTOs, Mappers, and Service Interfaces.
   - Coordinates domain model interactions to fulfill user transactions.
3. **Infrastructure Layer**:
   - Concrete implementations of repository interfaces, database persistence (Drift SQLite for mobile, Drizzle ORM + PostgreSQL for backend), external API clients, device hardware drivers (ESC/POS printers, Barcode scanners), and message brokers.
4. **Presentation / API Layer (Outermost)**:
   - For Mobile: Flutter Widgets, Riverpod/StateNotifier UI State, ViewModels, Theme, Router.
   - For Backend: NestJS Controllers, Guards, Interceptors, Filters, Swagger/OpenAPI annotations.`,
      codeSnippets: [
        {
          language: 'typescript',
          filename: 'architecture-layers.ts',
          code: `// DOMAIN LAYER (Pure Business Logic - No external dependencies)
export class Money {
  constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new InvalidMoneyException('Amount cannot be negative');
  }
  add(other: Money): Money {
    if (this.currency !== other.currency) throw new CurrencyMismatchException();
    return new Money(this.amount + other.amount, this.currency);
  }
}

// APPLICATION LAYER (CQRS Command Handler orchestrating Domain)
@CommandHandler(CompleteSaleCommand)
export class CompleteSaleHandler implements ICommandHandler<CompleteSaleCommand> {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesRepo: ISalesOrderRepository,
    @Inject(INVENTORY_LEDGER_REPOSITORY) private readonly inventoryRepo: IInventoryLedgerRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CompleteSaleCommand): Promise<SaleResultDto> {
    const sale = await this.salesRepo.findById(command.saleId);
    sale.complete(command.payments, command.completedAt);
    
    // Save aggregate & generate inventory movements
    await this.salesRepo.save(sale);
    const movements = StockMovementFactory.createFromSale(sale);
    await this.inventoryRepo.appendMovements(movements);
    
    // Dispatch Domain Events
    sale.domainEvents.forEach(event => this.eventBus.publish(event));
    return SaleMapper.toDto(sale);
  }
}`
        }
      ]
    },
    {
      id: 'arch-c4-model',
      title: '2.2 C4 Container & Context Architecture',
      content: `The system architecture is partitioned into modular runtime containers:

\`\`\`
+---------------------------------------------------------------------------------------------------+
|                                       CLIENT TIER (Mobile & Desktop)                              |
|  +---------------------------------------------------------------------------------------------+  |
|  | Flutter Client App (Android / iOS / Windows / macOS)                                        |  |
|  | - Presentation: Riverpod StateNotifier + Material 3 POS Shell                               |  |
|  | - Application: Use Cases (Checkout, ScanBarcode, OpenShift, SyncEngine)                    |  |
|  | - Domain: Pure Dart Aggregates (Cart, Order, InventoryItem, Customer)                       |  |
|  | - Infrastructure: Drift ORM (Encrypted SQLite) + Hardware Driver (ESC/POS, HID Scanner)    |  |
|  | - Offline Outbox Queue & Sync Client                                                        |  |
|  +---------------------------------------------------------------------------------------------+  |
+--------------------------------------------------+------------------------------------------------+
                                                   | HTTPS (JSON / Protobuf Sync Batches)
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                  API GATEWAY & LOAD BALANCER                                      |
|  - Cloudflare / NGINX / Cloud Run Load Balancer (TLS Termination, Rate Limiting, WAF)             |
+--------------------------------------------------+------------------------------------------------+
                                                   |
                                                   v
+---------------------------------------------------------------------------------------------------+
|                                    BACKEND SERVICES (NestJS Cluster)                             |
|  +---------------------------------------------------------------------------------------------+  |
|  | NestJS Modular Monolith / Microservice Ready                                                |  |
|  | - Auth & IAM Module (JWT, RBAC, Refresh Token Rotation, Multi-tenant Guards)                 |  |
|  | - Catalog & Pricing Module (Product Matrix, Dynamic Pricing Pipeline)                       |  |
|  | - Inventory & Purchasing Module (Double-Entry Ledger, POs, GRN, Stock Transfers)             |  |
|  | - Sales & POS Engine (Order Processing, Split Tenders, Taxes, Fiscal Records)                |  |
|  | - Sync Engine (Idempotency Validator, CRDT/LWW Conflict Resolver, Delta Replay Engine)      |  |
|  | - Reporting & Analytics (OLAP materialized queries, Financial Ledgers)                     |  |
|  +-----------------------------------+-------------------------------------+-------------------+  |
+--------------------------------------|-------------------------------------|----------------------+
                                       |                                     |
                 +---------------------+-----------------+                   |
                 |                                       |                   |
                 v                                       v                   v
+---------------------------------+  +-------------------------------+  +--------------------------+
| PRIMARY POSTGRESQL CLUSTER      |  | REDIS CLUSTER                 |  | OBJECT STORAGE (S3/GCS)  |
| - Drizzle ORM                   |  | - Token Revocation Blacklist  |  | - PDF Invoices & Receipts|
| - Multi-tenant Row-Level Sec    |  | - Distributed Locks (Redlock) |  | - Product High-Res Assets|
| - Append-only Ledger Tables     |  | - Real-time Stock Cache       |  | - Audit Archive Tarballs |
| - Read Replicas for Analytics   |  | - BullMQ Background Workers   |  |                          |
+---------------------------------+  +-------------------------------+  +--------------------------+
\`\`\``
    },
    {
      id: 'arch-bounded-contexts',
      title: '2.3 Bounded Contexts & Context Mapping',
      content: `The system is decomposed into 7 distinct Domain-Driven Design (DDD) Bounded Contexts:

1. **Identity & Access Management (IAM) Context**:
   - Handles Tenants, Stores, Cash Registers, Users, Roles, Permissions, and Session Security Tokens.
2. **Catalog & Pricing Context**:
   - Manages Categories, Brands, Products, Variants, Multi-Barcodes, Units of Measure, Unit Conversion Matrices, Customer Price Tiers, Volume Breaks, and Promotional Campaigns.
3. **Inventory & Procurement Context**:
   - Maintains the Immutable Double-Entry Stock Movement Ledger, Stocktakes, Reorder Points, Suppliers, Purchase Orders, and Goods Received Notes.
4. **Sales & Checkout Context**:
   - Manages Cart aggregation, Line-item Discounts, Pricing Execution, Split Payments, Receipts (ESC/POS & PDF), Cash Register Shift Balances, and Fiscal Sales Orders.
5. **Returns & Customer Relations Context**:
   - Manages Receipted/Unreceipted Product Returns, Customer Profiles, Store Credit Ledgers, and Loyalty Points accrual/redemption.
6. **Synchronization & Offline Context**:
   - Manages Client Outbox queues, Mutation Journals, Server Idempotency Keys, Vector Clocks, Conflict Resolution Policies, and Delta Ingestion.
7. **Audit & Reporting Context**:
   - Aggregates Immutable Audit Trails, Shift X/Z Reconciliation Reports, Tax Liability Summaries, and Store Performance Analytics.`
    }
  ]
};
