export enum RuntimeErrorType {
  MissingSecretError = 'MissingSecretError',
}

export class RuntimeError extends Error {
  constructor(
    public type: RuntimeErrorType,
    message?: string
  ) {
    super(message);
  }
}
