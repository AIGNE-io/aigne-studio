export class NoPermissionError extends Error {}

export class InvalidSubscriptionError extends Error {
  type = 'InvalidSubscriptionError';
}

export class ReachMaxRoundLimitError extends Error {
  type = 'ReachMaxRoundLimitError';
}
