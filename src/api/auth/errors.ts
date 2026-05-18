export class AuthError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function asAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  return new AuthError(500, 'INTERNAL_ERROR', 'Unexpected authentication error.');
}
