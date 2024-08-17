export function importPackageJson(): typeof import('../../../package.json') {
  // eslint-disable-next-line global-require
  return require('../../../package.json');
}
