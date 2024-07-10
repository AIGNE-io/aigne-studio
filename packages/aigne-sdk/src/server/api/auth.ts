export interface User {
  did: string;
  [key: string]: string | number | undefined;
}

export function userHeaders(user: User) {
  return {
    'x-user-did': user.did,
    'x-user-role': user.role,
    'x-user-provider': user.provider,
    'x-user-fullname': user.fullName && encodeURIComponent(user.fullName),
    'x-user-wallet-os': user.walletOS,
  };
}
