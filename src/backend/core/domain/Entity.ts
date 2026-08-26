export abstract class Entity<TProps> {
  protected readonly _id: string;
  protected readonly props: TProps;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  protected _version: number;

  constructor(id: string, props: TProps, version = 1, createdAt = new Date(), updatedAt = new Date()) {
    this._id = id;
    this.props = props;
    this._version = version;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  public equals(other?: Entity<TProps>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    return this._id === other._id;
  }

  protected touch(): void {
    this._updatedAt = new Date();
    this._version += 1;
  }
}

export interface DomainEvent {
  occurredOn: Date;
  eventName: string;
  aggregateId: string;
  payload: Record<string, any>;
}

export abstract class AggregateRoot<TProps> extends Entity<TProps> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
