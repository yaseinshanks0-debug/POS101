import { SpecSection } from '../types';

export const apiSpecSection: SpecSection = {
  id: 'api-spec',
  number: 5,
  title: 'API Specification & Communication Contracts',
  shortTitle: '5. API Specification',
  badge: 'Integration & Protocols',
  summary: 'Defines RESTful & RPC API contracts for POS operations, Master Data, Inventory Ledgers, Shift Management, and Offline Sync batch exchange with RFC 7807 error formatting.',
  subsections: [
    {
      id: 'api-design-standards',
      title: '5.1 API Design Standards & Idempotency Protocol',
      content: `The backend exposes a versioned JSON REST API (\`/api/v1/*\`) adhering to JSON:API and OpenAPI 3.1 standards with strict idempotency semantics:

### Idempotency Contract
All state-modifying operations (Sales, Refunds, Inventory adjustments, Cash movements) **MUST** include an \`Idempotency-Key: <UUIDv7>\` header.
- **Server Behavior**: The server verifies the key in Redis / PostgreSQL with a 72-hour TTL.
- If previously processed, the server immediately returns the cached HTTP response and body without re-executing business logic or inventory deductions.
- If in-flight, returns \`409 Conflict\` or \`425 Too Early\`.`,
      codeSnippets: [
        {
          language: 'json',
          filename: 'RFC 7807 Error Response Schema',
          code: `{
  "type": "https://api.pos-system.io/errors/insufficient-inventory",
  "title": "Insufficient Inventory for Sale",
  "status": 422,
  "detail": "Requested quantity (10.000) exceeds available stock (3.500) for SKU: BEV-SODA-CAN.",
  "instance": "/api/v1/sales/orders/018db502-990a-7bb1-8e01-1b918f6c3182",
  "invalidParams": [
    {
      "name": "items[0].quantity",
      "reason": "Available quantity: 3.500, Store policy: ALLOW_NEGATIVE_STOCK=false"
    }
  ],
  "timestamp": "2026-08-26T09:16:44.120Z"
}`
        }
      ]
    },
    {
      id: 'api-endpoints-matrix',
      title: '5.2 Core API Endpoints Catalog',
      content: `Key REST endpoints for the POS ecosystem:`,
      tables: [
        {
          headers: ['Method', 'Endpoint Route', 'Auth / RBAC Permission', 'Description & Payload'],
          rows: [
            ['POST', '/api/v1/auth/login', 'Public (Rate limited: 5/min)', 'Cashier / Admin login with username/password or PIN. Returns access JWT & secure httpOnly refresh cookie.'],
            ['POST', '/api/v1/auth/refresh', 'Public / Refresh Token', 'Rotates refresh token and issues fresh 15-minute access JWT.'],
            ['GET', '/api/v1/catalog/delta', 'pos:catalog_read', 'Pull catalog delta updates since client high-watermark timestamp (?since=2026-08-25T12:00:00Z).'],
            ['POST', '/api/v1/pos/shifts/open', 'pos:shifts_manage', 'Open register session with initial cash float declaration. Requires Idempotency-Key.'],
            ['POST', '/api/v1/pos/shifts/:id/close', 'pos:shifts_manage', 'Close shift with counted cash drawer breakdown and variance computation. Emits Z-Report.'],
            ['POST', '/api/v1/sales/orders', 'pos:sales_create', 'Submit a completed sale order with line items, split payments, and tax calculations.'],
            ['POST', '/api/v1/sales/returns', 'pos:returns_create', 'Process customer return against original order or unreceipted with supervisor PIN override.'],
            ['POST', '/api/v1/sync/batch/push', 'pos:sync_push', 'Bulk upload queued offline mutations (Sales, Stock Adjustments, Cash movements).'],
            ['GET', '/api/v1/sync/delta/pull', 'pos:sync_pull', 'Download server mutation log for current store since sequence watermark.'],
            ['GET', '/api/v1/reports/shifts/:id/pdf', 'pos:reports_read', 'Generate and stream PDF fiscal receipt / Z-Report document for thermal or A4 printing.']
          ]
        }
      ]
    },
    {
      id: 'api-sync-payloads',
      title: '5.3 Bulk Offline Sync API Contract',
      content: `The offline synchronization payload contract submitted by mobile terminals:`,
      codeSnippets: [
        {
          language: 'json',
          filename: 'POST /api/v1/sync/batch/push (Request Payload)',
          code: `{
  "clientDeviceId": "018db500-4521-7fa1-a1b2-8c440d999011",
  "storeId": "018db500-1122-7100-b3c4-9d110e888022",
  "batchId": "018db505-88aa-71c2-90ab-123456789abc",
  "lastServerSequence": 10452,
  "mutations": [
    {
      "mutationId": "018db505-88ab-71c2-90ab-123456789abd",
      "entityType": "SALES_ORDER",
      "operation": "CREATE",
      "occurredAt": "2026-08-26T08:45:10.000Z",
      "idempotencyKey": "pos-01-order-20260826-00102",
      "payload": {
        "id": "018db505-88ab-71c2-90ab-123456789abd",
        "orderNumber": "NYC01-20260826-0102",
        "cashierUserId": "018db500-9999-7000-a000-000000000001",
        "subtotal": "120.0000",
        "taxTotal": "10.8000",
        "grandTotal": "130.8000",
        "items": [
          {
            "variantId": "018db501-aaaa-7000-b000-111111111111",
            "uomId": "018db501-bbbb-7000-c000-222222222222",
            "quantity": "2.0000",
            "unitPrice": "60.0000",
            "lineTotal": "120.0000"
          }
        ],
        "payments": [
          {
            "tenderType": "CASH",
            "amount": "140.0000",
            "changeGiven": "9.2000"
          }
        ]
      }
    }
  ]
}`
        }
      ]
    }
  ]
};
