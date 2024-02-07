async function LoadTs() {
  try {
    return (await import('typescript')).default;
  } catch (e) {
    throw new Error(
      'You need to install TypeScript if you want to transpile TypeScript files and/or generate type definitions'
    );
  }
}

export async function TranspileTs(source: string) {
  const ts = await LoadTs();
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015 },
  }).outputText;
}
