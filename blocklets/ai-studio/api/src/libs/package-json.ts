export function importPackageJson(): { version: string; name: string } {
  // eslint-disable-next-line global-require
  return require('../../../package.json');
}
