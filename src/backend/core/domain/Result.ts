// Generic Result and Domain Error for DDD & CQRS
export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code = 'DOMAIN_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error?: DomainError | string;
  private readonly _value?: T;

  private constructor(isSuccess: boolean, error?: DomainError | string, value?: T) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this._value = value;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Cannot get the value of an error result: ${JSON.stringify(this.error)}`);
    }
    return this._value as T;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: DomainError | string): Result<U> {
    return new Result<U>(false, error);
  }
}
