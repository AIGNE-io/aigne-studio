import memoize from 'lodash/memoize';

export const transpileModule = memoize(async (source: string) => {
  const ts = await import('typescript');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
});
