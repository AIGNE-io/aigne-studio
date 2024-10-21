export enum RuntimeErrorType {
  MissingSecretError = 'MissingSecretError',
  ProjectRequestExceededError = 'ProjectRequestExceededError',
  ProjectLimitExceededError = 'ProjectLimitExceededError',
}

export class RuntimeError extends Error {
  constructor(
    public type: RuntimeErrorType,
    message?: string
  ) {
    super(message);
  }
}
