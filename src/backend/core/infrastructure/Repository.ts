import { Entity } from '../domain/Entity';
import { PaginationParams, PaginatedResult } from '../application/CQRS';

export interface IRepository<TEntity extends Entity<any>> {
  findById(tenantId: string, id: string): Promise<TEntity | null>;
  findPaginated(params: PaginationParams, filter?: (item: TEntity) => boolean): Promise<PaginatedResult<TEntity>>;
  save(tenantId: string, entity: TEntity): Promise<TEntity>;
  delete(tenantId: string, id: string): Promise<boolean>;
}

export class InMemoryRepository<TEntity extends Entity<any>> implements IRepository<TEntity> {
  protected items: Map<string, TEntity> = new Map();
  protected tenantIndex: Map<string, Set<string>> = new Map();

  protected makeKey(tenantId: string, id: string): string {
    return `${tenantId}::${id}`;
  }

  public async findById(tenantId: string, id: string): Promise<TEntity | null> {
    const key = this.makeKey(tenantId, id);
    const item = this.items.get(key);
    return item ? (Object.assign(Object.create(Object.getPrototypeOf(item)), item) as TEntity) : null;
  }

  public async findPaginated(
    params: PaginationParams,
    filter?: (item: TEntity) => boolean
  ): Promise<PaginatedResult<TEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const tenantId = params.tenantId;

    const ids = this.tenantIndex.get(tenantId) || new Set<string>();
    let allEntities: TEntity[] = [];

    for (const id of ids) {
      const entity = this.items.get(this.makeKey(tenantId, id));
      if (entity) {
        if (!filter || filter(entity)) {
          allEntities.push(entity);
        }
      }
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      allEntities = allEntities.filter(e => JSON.stringify((e as any).props).toLowerCase().includes(searchLower));
    }

    const total = allEntities.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = allEntities.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async save(tenantId: string, entity: TEntity): Promise<TEntity> {
    const key = this.makeKey(tenantId, entity.id);
    const existing = this.items.get(key);

    // Optimistic Concurrency Check
    if (existing && existing.version !== entity.version) {
      throw new Error(`Optimistic Concurrency Conflict: Entity ${entity.id} has version ${existing.version}, but update supplied version ${entity.version}`);
    }

    // Clone and persist
    this.items.set(key, entity);

    let tenantSet = this.tenantIndex.get(tenantId);
    if (!tenantSet) {
      tenantSet = new Set<string>();
      this.tenantIndex.set(tenantId, tenantSet);
    }
    tenantSet.add(entity.id);

    return entity;
  }

  public async delete(tenantId: string, id: string): Promise<boolean> {
    const key = this.makeKey(tenantId, id);
    const deleted = this.items.delete(key);
    const tenantSet = this.tenantIndex.get(tenantId);
    if (tenantSet) {
      tenantSet.delete(id);
    }
    return deleted;
  }

  public async clear(): Promise<void> {
    this.items.clear();
    this.tenantIndex.clear();
  }
}
