export class ClewError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ClewError';
    this.code = code;
    this.details = details;
  }
}

export const CLEW_ERROR_CODES = {
  PATH_OUTSIDE_ROOT: 'CLEW_PATH_OUTSIDE_ROOT',
  SYMLINK_ESCAPE: 'CLEW_SYMLINK_ESCAPE',
  INVALID_INPUT: 'CLEW_INVALID_INPUT',
  NOT_FOUND: 'CLEW_NOT_FOUND',
  EXECUTION_FORBIDDEN: 'CLEW_EXECUTION_FORBIDDEN',
  CANCELLED: 'CLEW_CANCELLED',
  INTERNAL: 'CLEW_INTERNAL',
} as const;
