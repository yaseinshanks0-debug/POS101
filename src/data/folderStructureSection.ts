import { SpecSection } from '../types';

export const folderStructureSection: SpecSection = {
  id: 'folder-structure',
  number: 11,
  title: 'Repository & Codebase Folder Structure',
  shortTitle: '11. Folder Structure',
  badge: 'Code Organization',
  summary: 'Standardized Clean Architecture file trees for both the NestJS backend and the Flutter mobile client application.',
  subsections: [
    {
      id: 'folder-nestjs',
      title: '11.1 NestJS Backend Modular Monolith Structure',
      content: `The backend follows domain-driven modular boundaries with CQRS commands, queries, events, and Drizzle repositories:`,
      codeSnippets: [
        {
          language: 'text',
          filename: 'backend/ (NestJS Architecture Tree)',
          code: `backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── core/                        # Cross-cutting foundational modules
│   │   ├── config/                  # Environment & App configuration
│   │   ├── database/                # Drizzle ORM client, Migrations & Seeds
│   │   │   ├── schema/              # Drizzle schema definition files
│   │   │   ├── migrations/          # SQL migration files
│   │   │   └── drizzle.provider.ts
│   │   ├── guards/                  # AuthGuard, RolesGuard, TenantGuard
│   │   ├── interceptors/           # IdempotencyInterceptor, AuditLoggingInterceptor
│   │   └── filters/                 # ProblemDetailsExceptionFilter (RFC 7807)
│   ├── modules/
│   │   ├── iam/                     # Auth & User Management
│   │   │   ├── application/         # Commands (LoginUser, RotateToken), Queries, DTOs
│   │   │   ├── domain/              # User, Role, Permission entities & interfaces
│   │   │   ├── infrastructure/      # DrizzleUserRepository, Argon2PasswordHasher
│   │   │   └── presentation/        # AuthController, UsersController
│   │   ├── catalog/                 # Products, Variants, Barcodes, Categories, UOMs
│   │   │   ├── application/         # Commands (CreateProduct, AddBarcode), Queries
│   │   │   ├── domain/              # ProductAggregate, PriceCalculator
│   │   │   ├── infrastructure/      # DrizzleProductRepository
│   │   │   └── presentation/        # ProductsController, CategoriesController
│   │   ├── inventory/               # Stock Ledger, POs, GRN, Transfers
│   │   │   ├── application/         # Commands (RecordStockMovement, ReceiveGoods)
│   │   │   ├── domain/              # InventoryItemAggregate, StockMovementFactory
│   │   │   ├── infrastructure/      # DrizzleInventoryLedgerRepository
│   │   │   └── presentation/        # InventoryController, PurchaseOrdersController
│   │   ├── sales/                   # POS Register, Orders, Payments, Returns
│   │   │   ├── application/         # Commands (CompleteSale, ProcessReturn)
│   │   │   ├── domain/              # SalesOrderAggregate, TaxCalculationEngine
│   │   │   ├── infrastructure/      # DrizzleSalesOrderRepository
│   │   │   └── presentation/        # SalesController, ReturnsController, ShiftsController
│   │   └── sync/                    # Offline-First Batch Sync Engine
│   │       ├── application/         # Commands (ProcessSyncBatch), Queries (PullDelta)
│   │       ├── domain/              # ConflictResolutionStrategy, VectorClockValidator
│   │       ├── infrastructure/      # DrizzleSyncCheckpointRepository
│   │       └── presentation/        # SyncController
├── test/                            # Integration & Chaos tests (Testcontainers)
├── drizzle.config.ts
├── package.json
└── tsconfig.json`
        }
      ]
    },
    {
      id: 'folder-flutter',
      title: '11.2 Flutter Mobile Client Clean Architecture Structure',
      content: `The mobile app follows feature-first Clean Architecture with Riverpod and Drift:`,
      codeSnippets: [
        {
          language: 'text',
          filename: 'mobile/ (Flutter Architecture Tree)',
          code: `mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── core/                        # Shared kernel & infrastructure
│   │   ├── database/                # Drift SQLite database & DAOs
│   │   │   ├── app_database.dart    # Encrypted SQLCipher database
│   │   │   ├── tables/              # Drift table definitions
│   │   │   └── daos/                # Data Access Objects
│   │   ├── network/                 # Dio client, Interceptors (Auth, Retry, Offline Queue)
│   │   ├── hardware/                # Peripheral device abstraction drivers
│   │   │   ├── printer/             # ESC/POS Bluetooth / TCP / USB driver
│   │   │   ├── scanner/             # HID keyboard wedge listener & ML Kit camera
│   │   │   └── cash_drawer/         # RJ11 drawer pulse controller
│   │   ├── theme/                   # Material 3 retail dark/light themes
│   │   └── utils/                   # Money formatting, Date utilities
│   ├── features/
│   │   ├── auth/                    # Login, PIN lock, Shift selection
│   │   │   ├── data/                # RemoteAuthDataSource, SecureStorageDao
│   │   │   ├── domain/              # AuthSession, UserCredentials
│   │   │   └── presentation/        # LoginScreen, PinPadScreen, AuthNotifier
│   │   ├── catalog/                 # Offline product catalog, Barcode lookup
│   │   │   ├── data/                # ProductDriftRepository, CatalogRemoteDataSource
│   │   │   ├── domain/              # Product, Variant, Barcode, UomConversion
│   │   │   └── presentation/        # ProductGridWidget, SearchBarWidget
│   │   ├── pos/                     # Cart, Pricing Engine, Checkout, Split Payments
│   │   │   ├── data/                # SalesOrderDriftRepository
│   │   │   ├── domain/              # CartAggregate, PricingEngine, TaxCalculator
│   │   │   ├── application/         # ProcessCheckoutUseCase, ApplyDiscountUseCase
│   │   │   └── presentation/        # PosScreen, CartView, PaymentDialog, ReceiptView
│   │   ├── inventory/               # Stock check, Quick adjustments, Receiving
│   │   │   ├── data/                # InventoryDriftRepository
│   │   │   ├── domain/              # StockLevel, MovementRecord
│   │   │   └── presentation/        # StockIntakeScreen, CycleCountScreen
│   │   └── sync/                    # Outbox mutation worker & background sync
│   │       ├── data/                # OutboxDriftDao, SyncApiClient
│   │       ├── domain/              # OutboxMutation, SyncResult
│   │       ├── application/         # SyncEngineService, NetworkStateNotifier
│   │       └── presentation/        # SyncStatusIndicatorWidget
├── test/                            # Unit tests, Widget tests, Mock hardware tests
├── pubspec.yaml
└── flutter_launcher_icons.yaml`
        }
      ]
    }
  ]
};
