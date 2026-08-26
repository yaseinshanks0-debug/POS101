export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AuditService {
  private static logs: AuditLogEntry[] = [];

  public static async record(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const log: AuditLogEntry = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date(),
    };
    this.logs.unshift(log);
    // Maintain max 500 in memory for simulation
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    return log;
  }

  public static getLogsByTenant(tenantId: string): AuditLogEntry[] {
    return this.logs.filter(l => l.tenantId === tenantId);
  }

  public static getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  public static clearLogs(): void {
    this.logs = [];
  }
}

export interface IdempotencyRecord {
  tenantId: string;
  key: string;
  requestPath: string;
  requestHash: string;
  responseStatus: number;
  responseBody: any;
  createdAt: Date;
  lockedUntil?: Date;
}

export class IdempotencyService {
  private static records = new Map<string, IdempotencyRecord>();

  private static makeKey(tenantId: string, key: string): string {
    return `${tenantId}::${key}`;
  }

  public static async get(tenantId: string, key: string): Promise<IdempotencyRecord | null> {
    const record = this.records.get(this.makeKey(tenantId, key));
    return record || null;
  }

  public static async set(record: IdempotencyRecord): Promise<void> {
    this.records.set(this.makeKey(record.tenantId, record.key), record);
  }

  public static async acquireLock(tenantId: string, key: string, requestHash: string, lockDurationMs = 10000): Promise<boolean> {
    const fullKey = this.makeKey(tenantId, key);
    const existing = this.records.get(fullKey);

    if (existing) {
      if (existing.lockedUntil && existing.lockedUntil > new Date()) {
        return false; // Still locked by in-flight request
      }
      return false; // Already completed
    }

    this.records.set(fullKey, {
      tenantId,
      key,
      requestPath: '',
      requestHash,
      responseStatus: 0,
      responseBody: null,
      createdAt: new Date(),
      lockedUntil: new Date(Date.now() + lockDurationMs),
    });

    return true;
  }
}
