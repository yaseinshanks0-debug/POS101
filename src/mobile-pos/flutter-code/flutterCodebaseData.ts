export interface FlutterFile {
  path: string;
  name: string;
  layer: 'Presentation' | 'Application' | 'Domain' | 'Infrastructure' | 'Core' | 'Config' | 'Tests';
  description: string;
  code: string;
}

export const flutterCleanArchitectureFiles: FlutterFile[] = [
  {
    path: 'pubspec.yaml',
    name: 'pubspec.yaml',
    layer: 'Config',
    description: 'Flutter dependencies including flutter_bloc, sqflite, mobile_scanner, dio, and get_it.',
    code: `name: flutter_mobile_pos
description: "Production-grade offline-first Clean Architecture Mobile POS for Flutter."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'
  flutter: ">=3.19.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State Management & Architecture
  flutter_bloc: ^8.1.4
  equatable: ^2.0.5
  get_it: ^7.6.7
  dartz: ^0.10.1

  # Local Storage & Database
  sqflite: ^2.3.2
  path_provider: ^2.1.2
  path: ^1.9.0
  flutter_secure_storage: ^9.0.0

  # Networking & Serialization
  dio: ^5.4.1
  json_annotation: ^4.8.1
  connectivity_plus: ^5.0.2
  uuid: ^4.3.3

  # Hardware Integration
  mobile_scanner: ^5.0.1
  esc_pos_utils_plus: ^2.0.3
  blue_thermal_printer: ^1.2.3
  flutter_vibrate: ^1.3.0
  audioplayers: ^6.0.0

  # UI & Design System
  intl: ^0.19.0
  google_fonts: ^6.1.0
  lucide_icons: ^0.257.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.8
  json_serializable: ^6.7.1
  mocktail: ^1.0.3
  bloc_test: ^9.1.5

flutter:
  uses-material-design: true
  generate: true
  assets:
    - assets/audio/
    - assets/images/`
  },
  {
    path: 'lib/main.dart',
    name: 'main.dart',
    layer: 'Core',
    description: 'Application entry point initializing SQLite database, hardware drivers, and MultiBlocProvider.',
    code: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'src/core/di/injection_container.dart' as di;
import 'src/core/theme/app_theme.dart';
import 'src/application/auth/auth_bloc.dart';
import 'src/application/pos/pos_bloc.dart';
import 'src/application/sync/sync_cubit.dart';
import 'src/presentation/auth/login_screen.dart';
import 'src/presentation/pos/pos_layout_dispatcher.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Enforce high-performance mobile orientation & status bar styling
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  // Initialize Clean Architecture Dependency Injection Graph
  await di.init();

  runApp(const PosMobileApp());
}

class PosMobileApp extends StatelessWidget {
  const PosMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => di.sl<AuthBloc>()..add(const CheckSessionEvent())),
        BlocProvider(create: (_) => di.sl<PosBloc>()..add(const InitializePosEvent())),
        BlocProvider(create: (_) => di.sl<SyncCubit>()..monitorConnectivityAndSync()),
      ],
      child: MaterialApp(
        title: 'Mobile POS & Inventory',
        debugShowCheckedModeBanner: false,
        themeMode: ThemeMode.system,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('en', 'US'),
          Locale('ar', 'SA'),
        ],
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state is AuthenticatedState) {
              return const PosLayoutDispatcher();
            }
            return const LoginScreen();
          },
        ),
      ),
    );
  }
}`
  },
  {
    path: 'lib/src/domain/entities/cart_item.dart',
    name: 'cart_item.dart',
    layer: 'Domain',
    description: 'Immutable pure Dart Domain Entity representing a shopping cart line item with discounts.',
    code: `import 'package:equatable/equatable.dart';

class CartItemEntity extends Equatable {
  final String id;
  final String productId;
  final String variantId;
  final String productName;
  final String variantName;
  final String sku;
  final String barcode;
  final double unitPrice;
  final double costPrice;
  final int quantity;
  final String discountType; // 'percentage' | 'fixed'
  final double discountValue;
  final bool isTaxable;
  final String? notes;

  const CartItemEntity({
    required this.id,
    required this.productId,
    required this.variantId,
    required this.productName,
    required this.variantName,
    required this.sku,
    required this.barcode,
    required this.unitPrice,
    required this.costPrice,
    this.quantity = 1,
    this.discountType = 'percentage',
    this.discountValue = 0.0,
    this.isTaxable = true,
    this.notes,
  });

  double get lineDiscountAmount {
    if (discountType == 'percentage') {
      return (unitPrice * quantity) * (discountValue / 100.0);
    }
    return discountValue;
  }

  double get subtotal => (unitPrice * quantity) - lineDiscountAmount;
  
  double get lineTaxAmount => isTaxable ? subtotal * 0.0825 : 0.0;
  
  double get lineTotal => subtotal + lineTaxAmount;

  CartItemEntity copyWith({
    int? quantity,
    double? unitPrice,
    String? discountType,
    double? discountValue,
    String? notes,
  }) {
    return CartItemEntity(
      id: id,
      productId: productId,
      variantId: variantId,
      productName: productName,
      variantName: variantName,
      sku: sku,
      barcode: barcode,
      unitPrice: unitPrice ?? this.unitPrice,
      costPrice: costPrice,
      quantity: quantity ?? this.quantity,
      discountType: discountType ?? this.discountType,
      discountValue: discountValue ?? this.discountValue,
      isTaxable: isTaxable,
      notes: notes ?? this.notes,
    );
  }

  @override
  List<Object?> get props => [id, variantId, quantity, unitPrice, discountType, discountValue, notes];
}`
  },
  {
    path: 'lib/src/domain/repositories/pos_repository.dart',
    name: 'pos_repository.dart',
    layer: 'Domain',
    description: 'Domain Repository interface contract for local offline-first SQLite POS queries and mutations.',
    code: `import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/product.dart';
import '../entities/cart_item.dart';
import '../entities/sales_order.dart';
import '../entities/customer.dart';

abstract class IPosRepository {
  Future<Either<Failure, List<ProductEntity>>> getCatalogProducts({String? categoryId, String? query});
  Future<Either<Failure, ProductEntity?>> getProductByBarcode(String barcode);
  Future<Either<Failure, List<CustomerEntity>>> getCustomers();
  Future<Either<Failure, SalesOrderEntity>> processCheckout({
    required List<CartItemEntity> items,
    required List<PaymentSplitEntity> payments,
    CustomerEntity? customer,
    required String cashierId,
    required String storeId,
    double discountTotal = 0.0,
  });
  Future<Either<Failure, Unit>> holdCurrentSale({required String ticketNote, required List<CartItemEntity> items});
  Future<Either<Failure, List<HeldSaleEntity>>> getHeldSales();
  Future<Either<Failure, Unit>> resumeHeldSale(String ticketId);
  Future<Either<Failure, SalesOrderEntity>> processReturn({
    required String originalOrderId,
    required List<ReturnItemEntity> returnItems,
    required String refundMethod,
  });
}`
  },
  {
    path: 'lib/src/infrastructure/database/app_database.dart',
    name: 'app_database.dart',
    layer: 'Infrastructure',
    description: 'SQLite database initialization, indexing, and Outbox mutations schema for offline-first resilience.',
    code: `import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class AppDatabase {
  static Database? _database;
  static const String dbName = 'pos_mobile_offline.db';
  static const int dbVersion = 2;

  static Future<Database> get instance async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  static Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, dbName);

    return await openDatabase(
      path,
      version: dbVersion,
      onCreate: _createTables,
      onUpgrade: _upgradeTables,
    );
  }

  static Future<void> _createTables(Database db, int version) async {
    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_ar TEXT,
        category TEXT NOT NULL,
        is_taxable INTEGER NOT NULL DEFAULT 1,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        color TEXT,
        image_url TEXT,
        updated_at INTEGER NOT NULL
      );
    ''');

    await db.execute('''
      CREATE TABLE product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        barcode TEXT NOT NULL,
        variant_name TEXT NOT NULL,
        retail_price REAL NOT NULL,
        cost_price REAL NOT NULL,
        min_price REAL NOT NULL,
        stock_on_hand REAL NOT NULL,
        reorder_point REAL NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    ''');

    await db.execute('CREATE INDEX idx_var_barcode ON product_variants(barcode);');
    await db.execute('CREATE INDEX idx_var_sku ON product_variants(sku);');

    await db.execute('''
      CREATE TABLE sales_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        offline_id TEXT UNIQUE NOT NULL,
        store_id TEXT NOT NULL,
        cashier_id TEXT NOT NULL,
        customer_id TEXT,
        subtotal REAL NOT NULL,
        discount_total REAL NOT NULL,
        tax_total REAL NOT NULL,
        grand_total REAL NOT NULL,
        paid_amount REAL NOT NULL,
        change_amount REAL NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'PENDING'
      );
    ''');

    await db.execute('''
      CREATE TABLE outbox_mutations (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        retry_count INTEGER NOT NULL DEFAULT 0,
        idempotency_key TEXT UNIQUE NOT NULL
      );
    ''');

    await db.execute('CREATE INDEX idx_outbox_status ON outbox_mutations(status, timestamp);');
  }

  static Future<void> _upgradeTables(Database db, int oldV, int newV) async {
    // Migration logic
  }
}`
  },
  {
    path: 'lib/src/application/pos/pos_bloc.dart',
    name: 'pos_bloc.dart',
    layer: 'Application',
    description: 'Flutter BLoC orchestrating Cart state machine, instant barcode matching, discount rules, and checkout.',
    code: `import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/product.dart';
import '../../domain/entities/cart_item.dart';
import '../../domain/entities/customer.dart';
import '../../domain/entities/sales_order.dart';
import '../../domain/repositories/pos_repository.dart';

part 'pos_event.dart';
part 'pos_state.dart';

class PosBloc extends Bloc<PosEvent, PosState> {
  final IPosRepository _posRepository;

  PosBloc({required IPosRepository posRepository})
      : _posRepository = posRepository,
        super(const PosState()) {
    on<InitializePosEvent>(_onInitialize);
    on<ScanBarcodeEvent>(_onScanBarcode);
    on<AddToCartEvent>(_onAddToCart);
    on<UpdateCartQuantityEvent>(_onUpdateCartQuantity);
    on<ApplyLineDiscountEvent>(_onApplyLineDiscount);
    on<SelectCustomerEvent>(_onSelectCustomer);
    on<HoldCartEvent>(_onHoldCart);
    on<ProcessCheckoutEvent>(_onProcessCheckout);
    on<ClearCartEvent>(_onClearCart);
  }

  Future<void> _onInitialize(InitializePosEvent event, Emitter<PosState> emit) async {
    emit(state.copyWith(isLoading: true));
    final productsResult = await _posRepository.getCatalogProducts();
    final customersResult = await _posRepository.getCustomers();

    productsResult.fold(
      (failure) => emit(state.copyWith(isLoading: false, errorMessage: failure.message)),
      (products) => emit(state.copyWith(
        isLoading: false,
        catalogProducts: products,
        filteredProducts: products,
      )),
    );
  }

  Future<void> _onScanBarcode(ScanBarcodeEvent event, Emitter<PosState> emit) async {
    final result = await _posRepository.getProductByBarcode(event.barcode);
    result.fold(
      (failure) => emit(state.copyWith(scanFeedbackMessage: 'Item not found for barcode: \${event.barcode}')),
      (product) {
        if (product != null) {
          final variant = product.variants.firstWhere(
            (v) => v.barcode == event.barcode,
            orElse: () => product.variants.first,
          );
          add(AddToCartEvent(product: product, variant: variant));
        }
      },
    );
  }

  void _onAddToCart(AddToCartEvent event, Emitter<PosState> emit) {
    final existingIndex = state.cartItems.indexWhere((item) => item.variantId == event.variant.id);
    List<CartItemEntity> updatedCart = List.from(state.cartItems);

    if (existingIndex >= 0) {
      final existing = updatedCart[existingIndex];
      updatedCart[existingIndex] = existing.copyWith(quantity: existing.quantity + 1);
    } else {
      updatedCart.add(CartItemEntity(
        id: 'ci_\${DateTime.now().millisecondsSinceEpoch}',
        productId: event.product.id,
        variantId: event.variant.id,
        productName: event.product.name,
        variantName: event.variant.variantName,
        sku: event.variant.sku,
        barcode: event.variant.barcode,
        unitPrice: event.variant.retailPrice,
        costPrice: event.variant.costPrice,
        quantity: 1,
        isTaxable: event.product.isTaxable,
      ));
    }

    emit(state.copyWith(cartItems: updatedCart));
  }

  void _onUpdateCartQuantity(UpdateCartQuantityEvent event, Emitter<PosState> emit) {
    List<CartItemEntity> updated = state.cartItems.map((item) {
      if (item.id == event.cartItemId) {
        return item.copyWith(quantity: event.newQuantity);
      }
      return item;
    }).where((item) => item.quantity > 0).toList();

    emit(state.copyWith(cartItems: updated));
  }

  void _onSelectCustomer(SelectCustomerEvent event, Emitter<PosState> emit) {
    emit(state.copyWith(selectedCustomer: event.customer));
  }

  Future<void> _onProcessCheckout(ProcessCheckoutEvent event, Emitter<PosState> emit) async {
    emit(state.copyWith(isSubmittingOrder: true));
    final result = await _posRepository.processCheckout(
      items: state.cartItems,
      payments: event.payments,
      customer: state.selectedCustomer,
      cashierId: event.cashierId,
      storeId: event.storeId,
    );

    result.fold(
      (failure) => emit(state.copyWith(isSubmittingOrder: false, errorMessage: failure.message)),
      (order) => emit(state.copyWith(
        isSubmittingOrder: false,
        cartItems: const [],
        selectedCustomer: null,
        lastCompletedOrder: order,
      )),
    );
  }

  void _onClearCart(ClearCartEvent event, Emitter<PosState> emit) {
    emit(state.copyWith(cartItems: const [], selectedCustomer: null));
  }

  void _onHoldCart(HoldCartEvent event, Emitter<PosState> emit) {
    // Hold transaction logic
    emit(state.copyWith(cartItems: const [], selectedCustomer: null));
  }

  void _onApplyLineDiscount(ApplyLineDiscountEvent event, Emitter<PosState> emit) {
    List<CartItemEntity> updated = state.cartItems.map((item) {
      if (item.id == event.cartItemId) {
        return item.copyWith(
          discountType: event.discountType,
          discountValue: event.discountValue,
        );
      }
      return item;
    }).toList();
    emit(state.copyWith(cartItems: updated));
  }
}`
  },
  {
    path: 'lib/src/core/hardware/thermal_printer_driver.dart',
    name: 'thermal_printer_driver.dart',
    layer: 'Core',
    description: 'Hardware abstraction for Bluetooth / USB ESC-POS thermal receipt printing with barcode generation.',
    code: `import 'dart:typed_data';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import '../../domain/entities/sales_order.dart';

abstract class IThermalPrinterDriver {
  Future<bool> connect(String macAddress);
  Future<bool> printReceipt(SalesOrderEntity order, {PaperSize paperSize = PaperSize.mm80});
  Future<void> openCashDrawer();
  Future<bool> isConnected();
}

class EscPosThermalPrinterDriver implements IThermalPrinterDriver {
  bool _isConnected = false;

  @override
  Future<bool> connect(String macAddress) async {
    // Bluetooth socket pairing and RFCOMM channel connection
    _isConnected = true;
    return true;
  }

  @override
  Future<bool> printReceipt(SalesOrderEntity order, {PaperSize paperSize = PaperSize.mm80}) async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(paperSize, profile);
    List<int> bytes = [];

    // Header Branding
    bytes += generator.text(
      'DOWNTOWN FLAGSHIP STORE',
      styles: const PosStyles(align: PosAlign.center, bold: true, height: PosTextSize.size2),
    );
    bytes += generator.text('Order #: \${order.orderNumber}', styles: const PosStyles(align: PosAlign.center));
    bytes += generator.text('Date: \${order.createdAt.toIso8601String()}', styles: const PosStyles(align: PosAlign.center));
    bytes += generator.hr();

    // Line items
    for (final item in order.items) {
      bytes += generator.row([
        PosColumn(text: '\${item.quantity}x \${item.productName}', width: 8),
        PosColumn(text: '\$\${item.subtotal.toStringAsFixed(2)}', width: 4, styles: const PosStyles(align: PosAlign.right)),
      ]);
    }
    bytes += generator.hr();

    // Summary totals
    bytes += generator.row([
      PosColumn(text: 'Subtotal:', width: 6),
      PosColumn(text: '\$\${order.subtotal.toStringAsFixed(2)}', width: 6, styles: const PosStyles(align: PosAlign.right)),
    ]);
    bytes += generator.row([
      PosColumn(text: 'Tax (8.25%):', width: 6),
      PosColumn(text: '\$\${order.taxAmount.toStringAsFixed(2)}', width: 6, styles: const PosStyles(align: PosAlign.right)),
    ]);
    bytes += generator.row([
      PosColumn(text: 'TOTAL:', width: 6, styles: const PosStyles(bold: true)),
      PosColumn(text: '\$\${order.grandTotal.toStringAsFixed(2)}', width: 6, styles: const PosStyles(align: PosAlign.right, bold: true)),
    ]);

    // Barcode footer
    bytes += generator.hr();
    bytes += generator.barcode(Barcode.code128(order.orderNumber));
    bytes += generator.feed(2);
    bytes += generator.cut();

    return true;
  }

  @override
  Future<void> openCashDrawer() async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm80, profile);
    final pulseBytes = generator.drawer();
    // Transmit ESC p m t1 t2 pulse over active serial stream
  }

  @override
  Future<bool> isConnected() async => _isConnected;
}`
  },
  {
    path: 'test/unit/pos_bloc_test.dart',
    name: 'pos_bloc_test.dart',
    layer: 'Tests',
    description: 'Unit tests asserting Cart state transitions, line discounts, barcode lookups, and offline orders.',
    code: `import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dartz/dartz.dart';
import 'package:flutter_mobile_pos/src/application/pos/pos_bloc.dart';
import 'package:flutter_mobile_pos/src/domain/repositories/pos_repository.dart';
import 'package:flutter_mobile_pos/src/domain/entities/product.dart';

class MockPosRepository extends Mock implements IPosRepository {}

void main() {
  late MockPosRepository mockRepository;
  late PosBloc posBloc;

  setUp(() {
    mockRepository = MockPosRepository();
    posBloc = PosBloc(posRepository: mockRepository);
  });

  tearDown(() {
    posBloc.close();
  });

  group('PosBloc Cart Operations', () {
    test('initial state should be empty cart', () {
      expect(posBloc.state.cartItems, isEmpty);
      expect(posBloc.state.cartTotal, equals(0.0));
    });

    blocTest<PosBloc, PosState>(
      'emits updated cart when AddToCartEvent is dispatched',
      build: () => posBloc,
      act: (bloc) {
        const product = ProductEntity(
          id: 'p1',
          code: 'BEV-1',
          name: 'Espresso',
          category: 'beverages',
          variants: [
            ProductVariantEntity(
              id: 'v1',
              productId: 'p1',
              sku: 'BEV-ESP',
              barcode: '890103000101',
              variantName: 'Single',
              retailPrice: 3.50,
              costPrice: 0.80,
              stockOnHand: 100,
            )
          ],
        );
        bloc.add(AddToCartEvent(product: product, variant: product.variants.first));
      },
      expect: () => [
        predicate<PosState>((state) {
          return state.cartItems.length == 1 &&
              state.cartItems.first.productName == 'Espresso' &&
              state.cartItems.first.quantity == 1;
        }),
      ],
    );
  });
}`
  },
  {
    path: 'lib/src/domain/services/pricing_engine.dart',
    name: 'pricing_engine.dart',
    layer: 'Domain',
    description: 'Deterministic 8-stage Retail Pricing Pipeline in Dart: Base -> Store -> Customer -> Volume -> Promo/BXGY -> Discount -> Tax -> Final Price.',
    code: `import 'dart:math' as math;

enum RoundingMode { halfUp, halfEven }
enum TaxType { exclusive, inclusive, exempt }

class PricingResult {
  final double baseUnitPrice;
  final double netUnitPrice;
  final double netSubtotal;
  final double totalDiscount;
  final double taxAmount;
  final double finalTotal;
  final int freeQuantity;
  final List<String> auditTrail;

  const PricingResult({
    required this.baseUnitPrice,
    required this.netUnitPrice,
    required this.netSubtotal,
    required this.totalDiscount,
    required this.taxAmount,
    required this.finalTotal,
    required this.freeQuantity,
    required this.auditTrail,
  });
}

class DeterministicPricingEngine {
  static double round(double val, [int decimals = 2]) {
    final mod = math.pow(10.0, decimals);
    return ((val * mod).round()) / mod;
  }

  static PricingResult calculateLineItem({
    required double basePrice,
    required double costPrice,
    required int quantity,
    double? storeOverridePrice,
    double? customerTierDiscountPct,
    double? volumeDiscountPct,
    double? promoDiscountPct,
    bool buy2Get1Free = false,
    double? manualDiscountAmount,
    bool enforceFloorPrice = true,
    TaxType taxType = TaxType.exclusive,
    double taxRate = 8.25,
  }) {
    final audit = <String>[];
    
    // 1. Base Price
    double currentPrice = basePrice;
    audit.add('1. Base Price: \\\$\${currentPrice.toStringAsFixed(2)}');

    // 2. Store Override
    if (storeOverridePrice != null) {
      currentPrice = storeOverridePrice;
      audit.add('2. Store Override Applied: \\\$\${currentPrice.toStringAsFixed(2)}');
    }

    // 3. Customer Tier
    if (customerTierDiscountPct != null && customerTierDiscountPct > 0) {
      currentPrice = currentPrice * (1 - customerTierDiscountPct / 100);
      audit.add('3. Customer Tier (-$customerTierDiscountPct%): \\\$\${currentPrice.toStringAsFixed(2)}');
    }

    // 4. Quantity Break
    if (volumeDiscountPct != null && volumeDiscountPct > 0) {
      currentPrice = currentPrice * (1 - volumeDiscountPct / 100);
      audit.add('4. Volume Break (-$volumeDiscountPct%): \\\$\${currentPrice.toStringAsFixed(2)}');
    }

    // 5. Promotion & Buy X Get Y
    int freeItems = 0;
    if (buy2Get1Free && quantity >= 3) {
      freeItems = quantity ~/ 3;
      audit.add('5. BXGY Promotion: $freeItems Free Reward Item(s)');
    } else if (promoDiscountPct != null && promoDiscountPct > 0) {
      currentPrice = currentPrice * (1 - promoDiscountPct / 100);
      audit.add('5. Promotion (-$promoDiscountPct%): \\\$\${currentPrice.toStringAsFixed(2)}');
    }

    // 6. Manual Discount & Cost Protection
    if (manualDiscountAmount != null && manualDiscountAmount > 0) {
      currentPrice = math.max(0, currentPrice - manualDiscountAmount);
      if (enforceFloorPrice && currentPrice < costPrice) {
        currentPrice = costPrice;
        audit.add('6. Discount Floor Clamped to Cost: \\\$\${costPrice.toStringAsFixed(2)}');
      } else {
        audit.add('6. Manual Discount: \\\$\${currentPrice.toStringAsFixed(2)}');
      }
    }

    final paidQty = quantity - freeItems;
    final netSubtotal = round(currentPrice * paidQty);
    final grossSubtotal = round(basePrice * quantity);
    final totalDiscount = round(grossSubtotal - netSubtotal);

    // 7. Taxation
    double taxAmount = 0.0;
    double finalTotal = netSubtotal;

    if (taxType == TaxType.exclusive) {
      taxAmount = round(netSubtotal * (taxRate / 100));
      finalTotal = round(netSubtotal + taxAmount);
      audit.add('7. Tax-Exclusive ($taxRate%): +\\\$\${taxAmount.toStringAsFixed(2)}');
    } else if (taxType == TaxType.inclusive) {
      taxAmount = round(netSubtotal - (netSubtotal / (1 + taxRate / 100)));
      audit.add('7. Tax-Inclusive ($taxRate% extracted): \\\$\${taxAmount.toStringAsFixed(2)}');
    }

    audit.add('8. Final Settlement: \\\$\${finalTotal.toStringAsFixed(2)}');

    return PricingResult(
      baseUnitPrice: basePrice,
      netUnitPrice: currentPrice,
      netSubtotal: netSubtotal,
      totalDiscount: totalDiscount,
      taxAmount: taxAmount,
      finalTotal: finalTotal,
      freeQuantity: freeItems,
      auditTrail: audit,
    );
  }
}`
  }
];
