export function getComponentMountPoint(name: string): string | undefined {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line global-require
    return require('@blocklet/sdk/lib/component').getComponentMountPoint(name);
  }
  return globalThis.blocklet?.componentMountPoints.find((i) => i.name === name || i.did === name)?.mountPoint;
}

export function appUrl(): string | undefined {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line global-require
    return require('@blocklet/sdk/lib/config').env.appUrl;
  }

  return globalThis.blocklet?.appUrl;
}
