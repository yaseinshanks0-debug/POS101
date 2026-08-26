import { OutboxMutation, MobileSalesOrder, StockMovement, MobileProduct } from '../types';

export class OfflineSyncEngine {
  private static isOnline: boolean = true;
  private static outboxQueue: OutboxMutation[] = [];
  private static syncListeners: Array<() => void> = [];

  public static setNetworkStatus(online: boolean): void {
    this.isOnline = online;
    this.notifyListeners();
  }

  public static getNetworkStatus(): boolean {
    return this.isOnline;
  }

  public static getOutbox(): OutboxMutation[] {
    return [...this.outboxQueue];
  }

  public static getPendingCount(): number {
    return this.outboxQueue.filter(m => m.status === 'PENDING').length;
  }

  public static subscribe(listener: () => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners(): void {
    this.syncListeners.forEach(listener => listener());
  }

  // Enqueue local mutation into SQLite Outbox Table
  public static enqueueMutation(
    entityType: OutboxMutation['entityType'],
    entityId: string,
    action: OutboxMutation['action'],
    payload: any,
    userId: string,
    deviceId: string = 'POS-MOB-01'
  ): OutboxMutation {
    const mutation: OutboxMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operationId: `op_vclock_${Date.now()}`,
      entityType,
      entityId,
      action,
      payload,
      deviceId,
      userId,
      timestamp: new Date().toISOString(),
      status: this.isOnline ? 'PENDING' : 'PENDING',
      retryCount: 0,
      idempotencyKey: payload.idempotencyKey || `idemp_${entityId}_${Date.now()}`,
    };

    this.outboxQueue.unshift(mutation);
    this.notifyListeners();

    // Auto-sync if currently online
    if (this.isOnline) {
      setTimeout(() => {
        this.processSync();
      }, 400);
    }

    return mutation;
  }

  // Idempotent sync processor
  public static async processSync(): Promise<{ syncedCount: number; errors: number }> {
    if (!this.isOnline) {
      return { syncedCount: 0, errors: 0 };
    }

    const pending = this.outboxQueue.filter(m => m.status === 'PENDING');
    let syncedCount = 0;
    let errors = 0;

    for (const mutation of pending) {
      try {
        // Simulate network API roundtrip with latency
        await new Promise(resolve => setTimeout(resolve, 150));
        mutation.status = 'SYNCED';
        syncedCount++;
      } catch (err: any) {
        mutation.retryCount++;
        mutation.errorMessage = err?.message || 'Sync conflict or network failure';
        mutation.status = 'FAILED';
        errors++;
      }
    }

    this.notifyListeners();
    return { syncedCount, errors };
  }

  public static clearSynced(): void {
    this.outboxQueue = this.outboxQueue.filter(m => m.status !== 'SYNCED');
    this.notifyListeners();
  }
}
