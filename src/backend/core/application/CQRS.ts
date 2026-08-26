import { Result } from '../domain/Result';

export interface ICommand<TResult = any> {
  readonly _commandBrand?: TResult;
}

export interface IQuery<TResult = any> {
  readonly _queryBrand?: TResult;
}

export interface ICommandHandler<TCommand extends ICommand<TResult>, TResult = any> {
  execute(command: TCommand): Promise<Result<TResult>>;
}

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult = any> {
  execute(query: TQuery): Promise<Result<TResult>>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  tenantId: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CommandBus {
  private handlers = new Map<string, ICommandHandler<any, any>>();

  public register<TCommand extends ICommand<TResult>, TResult>(
    commandName: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(commandName, handler);
  }

  public async execute<TResult>(commandName: string, command: ICommand<TResult>): Promise<Result<TResult>> {
    const handler = this.handlers.get(commandName);
    if (!handler) {
      return Result.fail(`No handler registered for command: ${commandName}`);
    }
    try {
      return await handler.execute(command);
    } catch (err: any) {
      return Result.fail(`Command execution failed: ${err.message}`);
    }
  }
}

export class QueryBus {
  private handlers = new Map<string, IQueryHandler<any, any>>();

  public register<TQuery extends IQuery<TResult>, TResult>(
    queryName: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryName, handler);
  }

  public async execute<TResult>(queryName: string, query: IQuery<TResult>): Promise<Result<TResult>> {
    const handler = this.handlers.get(queryName);
    if (!handler) {
      return Result.fail(`No handler registered for query: ${queryName}`);
    }
    try {
      return await handler.execute(query);
    } catch (err: any) {
      return Result.fail(`Query execution failed: ${err.message}`);
    }
  }
}
