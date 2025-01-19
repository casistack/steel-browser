import { AppError } from '../plugins/error-handler';

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(429, message, { retryAfter });
    this.name = 'TooManyRequestsError';
  }
}

// Utility functions for error checking
export function assertExists<T>(
  value: T | null | undefined,
  resource: string
): T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource);
  }
  return value;
}

export function assertPermission(
  condition: boolean,
  message = 'Insufficient permissions'
): void {
  if (!condition) {
    throw new ForbiddenError(message);
  }
}

export function assertAuthenticated(
  condition: boolean,
  message = 'Authentication required'
): void {
  if (!condition) {
    throw new UnauthorizedError(message);
  }
}

export function assertValid(
  condition: boolean,
  message: string,
  details?: unknown
): void {
  if (!condition) {
    throw new ValidationError(message, details);
  }
}

export function assertNoConflict(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new ConflictError(message);
  }
}
