import { SpecSection } from '../types';

export const securitySpecSection: SpecSection = {
  id: 'security-spec',
  number: 8,
  title: 'Security & Compliance Specification',
  shortTitle: '8. Security Architecture',
  badge: 'Security & IAM',
  summary: 'Enterprise security architecture covering OIDC / JWT authentication, refresh token rotation, fine-grained RBAC permission matrix, SQLCipher device encryption, and immutable audit logs.',
  subsections: [
    {
      id: 'sec-auth-tokens',
      title: '8.1 Authentication & Token Lifecycle',
      content: `The system implements a stateless, dual-token authentication scheme engineered for high-security mobile environments:

1. **Access Tokens**:
   - Short-lived (15 minutes) signed JWT (\`RS256\` or \`EdDSA\`).
   - Claims: \`sub\` (User ID), \`tid\` (Tenant ID), \`sid\` (Store ID), \`rid\` (Register ID), \`roles\`, and \`permissions\` array.
2. **Refresh Tokens**:
   - Long-lived (30 days) cryptographically random high-entropy token stored in hardware-backed Secure Storage on mobile and HttpOnly / SameSite=Strict cookies on web.
   - **Rotation**: Every refresh request invalidates the old refresh token and issues a new pair.
   - **Reuse Detection**: If a revoked refresh token is presented, the auth server immediately invalidates the entire token family, logging a potential theft alert.
3. **PIN Authentication for Fast Terminal Switching**:
   - Cashiers can switch shifts or unlock the POS terminal with a 4-6 digit numeric PIN.
   - Hashed using Argon2id with unique salt and device hardware binding.`,
      codeSnippets: [
        {
          language: 'typescript',
          filename: 'jwt-payload.interface.ts',
          code: `export interface JwtAuthPayload {
  sub: string;             // User UUID
  tid: string;             // Tenant UUID
  sid: string;             // Current Store UUID
  rid?: string;            // Bound Register UUID
  username: string;
  roles: string[];         // ['CASHIER', 'SHIFT_SUPERVISOR']
  permissions: string[];   // ['pos:checkout', 'pos:discount_apply', 'inventory:view']
  iat: number;
  exp: number;             // 15 minutes TTL
  iss: 'pos-auth-engine';
}`
        }
      ]
    },
    {
      id: 'sec-rbac-matrix',
      title: '8.2 Role-Based Access Control (RBAC) & Permission Matrix',
      content: `Fine-grained permission structure guarding API routes and mobile UI actions:`,
      tables: [
        {
          headers: ['Permission Key', 'Cashier', 'Shift Supervisor', 'Store Manager', 'Admin / Owner'],
          rows: [
            ['pos:checkout', 'Yes', 'Yes', 'Yes', 'Yes'],
            ['pos:price_override', 'No (Requires PIN)', 'Yes (Max 15%)', 'Yes (Max 50%)', 'Yes (Unlimited)'],
            ['pos:line_discount', 'Yes (Max 10%)', 'Yes (Max 25%)', 'Yes (Max 100%)', 'Yes (Unlimited)'],
            ['pos:refund_with_receipt', 'Yes', 'Yes', 'Yes', 'Yes'],
            ['pos:refund_unreceipted', 'No (Requires PIN)', 'Yes', 'Yes', 'Yes'],
            ['pos:cash_drawer_manual_open', 'No', 'Yes', 'Yes', 'Yes'],
            ['inventory:stock_adjust', 'No', 'No', 'Yes', 'Yes'],
            ['inventory:stock_transfer', 'No', 'Yes (Intake only)', 'Yes', 'Yes'],
            ['purchasing:create_po', 'No', 'No', 'Yes', 'Yes'],
            ['reports:view_x_report', 'Yes', 'Yes', 'Yes', 'Yes'],
            ['reports:view_z_report_financials', 'No', 'No', 'Yes', 'Yes'],
            ['iam:manage_users', 'No', 'No', 'No', 'Yes']
          ]
        }
      ]
    },
    {
      id: 'sec-encryption-audit',
      title: '8.3 Local Encryption & Immutable Audit Logging',
      content: `Data protection at rest and in transit:

1. **Mobile Local Storage Encryption**:
   - The Drift SQLite database is encrypted with **SQLCipher** using **AES-256-CBC / GCM**.
   - The master encryption key is generated on initial app provisioning and stored in Android Keystore / iOS Keychain.
2. **Audit Logging**:
   - Every financial override, cash drawer pop, discount grant, price change, and voided transaction writes an immutable entry to \`audit_logs\`.
   - Fields: \`user_id\`, \`tenant_id\`, \`store_id\`, \`action_name\`, \`ip_address\`, \`device_id\`, \`old_state\`, \`new_state\`, \`occurred_at\`.`
    }
  ]
};
