export interface AppErrorOptions {
  statusCode?: number;
  details?: unknown;
  cause?: unknown;
}

/** Operational error carrying an HTTP status; handled by the central error middleware. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.statusCode = options.statusCode ?? 400;
    this.details = options.details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(message, { statusCode: 400, details });
export const unauthorized = (message = 'Authentication required') =>
  new AppError(message, { statusCode: 401 });
export const forbidden = (message = 'You do not have permission to do this') =>
  new AppError(message, { statusCode: 403 });
export const notFound = (message = 'Resource not found') =>
  new AppError(message, { statusCode: 404 });
export const conflict = (message: string) => new AppError(message, { statusCode: 409 });
export const tooMany = (message = 'Too many requests, please slow down') =>
  new AppError(message, { statusCode: 429 });
