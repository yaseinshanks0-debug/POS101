import { SpecSection } from '../types';

export const mobileArchSection: SpecSection = {
  id: 'mobile-arch',
  number: 6,
  title: 'Mobile Architecture (Flutter & Dart)',
  shortTitle: '6. Mobile Architecture',
  badge: 'Flutter & Dart',
  summary: 'Architectural blueprint for the cross-platform Flutter mobile POS application utilizing Clean Architecture, Riverpod, Drift encrypted SQLite, and native hardware drivers (ESC/POS thermal printers, HID barcode scanners).',
  subsections: [
    {
      id: 'mobile-clean-layers',
      title: '6.1 Flutter Clean Architecture Layer Separation',
      content: `The Flutter application strictly isolates UI widgets from business logic through 4 architectural tiers:

1. **Presentation Layer**:
   - **UI Views & Widgets**: Pure stateless or hooked widgets rendering state streams. Zero business calculations.
   - **State Management (Riverpod 2.x)**: \`AsyncNotifier\` / \`StateNotifier\` controllers exposing immutable UI State DTOs.
2. **Application Layer**:
   - **Use Cases / Interactors**: Single-responsibility command classes (e.g. \`ProcessCartCheckoutUseCase\`, \`ScanBarcodeUseCase\`, \`PerformOfflineSyncUseCase\`).
   - Coordinates domain models, triggers local repositories, and dispatches outbox mutations.
3. **Domain Layer (Pure Dart)**:
   - **Entities & Value Objects**: Pure Dart classes with zero Flutter or Drift imports.
   - **Repository Interfaces**: Abstract contracts (\`ISalesOrderRepository\`, \`IProductCatalogRepository\`, \`IInventoryRepository\`).
   - **Domain Errors**: Strongly-typed failure hierarchies.
4. **Infrastructure Layer**:
   - **Drift Database (SQLCipher)**: Local offline SQLite database with reactive Dart streams.
   - **Hardware Device Drivers**: ESC/POS thermal printer driver (Bluetooth Low Energy, WiFi/Ethernet TCP, USB OTG), Camera scanner via ML Kit, and USB/Bluetooth HID hardware barcode wedge.
   - **Network & Sync Engine**: Dio HTTP client with retry policies, JWT refresh interceptor, and background outbox sync worker.`,
      codeSnippets: [
        {
          language: 'dart',
          filename: 'lib/features/pos/application/usecases/process_checkout_usecase.dart',
          code: `import 'package:dartz/dartz.dart';
import '../../domain/entities/cart.dart';
import '../../domain/entities/sales_order.dart';
import '../../domain/failures/pos_failure.dart';
import '../../domain/repositories/i_sales_order_repository.dart';
import '../../../sync/domain/repositories/i_outbox_repository.dart';

class ProcessCheckoutUseCase {
  final ISalesOrderRepository _salesRepo;
  final IOutboxRepository _outboxRepo;

  ProcessCheckoutUseCase(this._salesRepo, this._outboxRepo);

  Future<Either<PosFailure, SalesOrder>> execute({
    required Cart cart,
    required List<PaymentTender> payments,
    required String cashierId,
    required String shiftId,
  }) async {
    // 1. Domain Validation & Order Construction
    final orderOrFailure = cart.toFinalizedOrder(
      cashierId: cashierId,
      shiftId: shiftId,
      payments: payments,
    );

    return orderOrFailure.fold(
      (failure) => Left(failure),
      (salesOrder) async {
        try {
          // 2. Persist locally to Drift SQLite (Atomic Transaction)
          await _salesRepo.saveOrderLocally(salesOrder);

          // 3. Queue into Offline Outbox for Cloud Sync
          await _outboxRepo.enqueueMutation(
            entityType: 'SALES_ORDER',
            operation: 'CREATE',
            idempotencyKey: salesOrder.idempotencyKey,
            payload: salesOrder.toJson(),
          );

          return Right(salesOrder);
        } catch (e) {
          return Left(PosFailure.storageError(e.toString()));
        }
      },
    );
  }
}`
        }
      ]
    },
    {
      id: 'mobile-hardware-integration',
      title: '6.2 Hardware Peripheral Integration Pipeline',
      content: `The POS terminal integrates with external retail peripherals via abstract driver interfaces:

1. **ESC/POS Thermal Receipt Printing**:
   - Direct raw byte command generation supporting 58mm and 80mm paper widths.
   - Channels: Bluetooth Low Energy (BLE), WiFi/Ethernet Direct Raw TCP (Port 9100), and USB OTG.
   - Features: High-speed raster bitmap rendering, cash drawer kick pulse command (\`ESC p 0 25 250\`), paper cut command (\`GS V 66 0\`).
2. **Barcode & 2D Scanning**:
   - **Hardware HID Wedge**: Listens for physical keyboard-event stream buffers terminated with \`Enter\` (0ms latency, works seamlessly with Honeywell, Zebra, Sunmi scanners).
   - **Integrated Camera Scanner**: Hardware-accelerated Google ML Kit barcode detection with custom bounding-box viewport.
3. **Cash Drawer Interface**:
   - RJ11 / RJ12 connection triggered automatically via ESC/POS pulse on cash checkout or manual supervisor kick.`,
      codeSnippets: [
        {
          language: 'dart',
          filename: 'lib/core/hardware/printer/esc_pos_service.dart',
          code: `class EscPosPrinterService {
  final PrinterConnection _connection;

  EscPosPrinterService(this._connection);

  Future<void> printReceipt(SalesOrderReceiptViewModel receipt) async {
    final bytes = <int>[];
    // ESC @ -> Initialize printer
    bytes.addAll([0x1B, 0x40]);
    // Align Center
    bytes.addAll([0x1B, 0x61, 0x01]);
    // Bold On + Double Height Header
    bytes.addAll([0x1B, 0x45, 0x01, 0x1D, 0x21, 0x11]);
    bytes.addAll(utf8.encode('\${receipt.storeName}\\n'));
    
    // Reset Formatting
    bytes.addAll([0x1D, 0x21, 0x00, 0x1B, 0x45, 0x00]);
    bytes.addAll(utf8.encode('Receipt: \${receipt.orderNumber}\\n'));
    bytes.addAll(utf8.encode('Date: \${receipt.formattedDate}\\n'));
    bytes.addAll(utf8.encode('--------------------------------\\n'));
    
    // Items Table (Align Left)
    bytes.addAll([0x1B, 0x61, 0x00]);
    for (final item in receipt.items) {
      final line = formatReceiptItemLine(item.name, item.quantity, item.lineTotal);
      bytes.addAll(utf8.encode('$line\\n'));
    }
    
    bytes.addAll(utf8.encode('================================\\n'));
    bytes.addAll(utf8.encode('TOTAL: \${receipt.formattedGrandTotal}\\n'));
    
    // Feed 3 lines & Cut Paper
    bytes.addAll([0x1B, 0x64, 0x03, 0x1D, 0x56, 0x42, 0x00]);
    
    // Cash Drawer Kick if cash tender
    if (receipt.hasCashPayment) {
      bytes.addAll([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }
    
    await _connection.sendRawBytes(Uint8List.fromList(bytes));
  }
}`
        }
      ]
    }
  ]
};
