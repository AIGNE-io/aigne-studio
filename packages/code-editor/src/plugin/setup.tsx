const prettier = Promise.all([
  import('prettier'),
  import('prettier/plugins/typescript'),
  import('prettier/plugins/estree'),
]);

const formatCode = async (code: string) => {
  return prettier.then(async ([prettier, typescriptPlugin, estreePlugin]) => {
    return prettier.format(code, {
      parser: 'typescript',
      plugins: [typescriptPlugin, estreePlugin.default],
      printWidth: 120,
      useTabs: false,
      tabWidth: 2,
      trailingComma: 'es5',
      bracketSameLine: true,
      semi: true,
      singleQuote: true,
    });
  });
};

let monacoConfigured = false;

function setupMonaco({ themeName, monaco }: { themeName: string; monaco: typeof import('monaco-editor') }) {
  if (monacoConfigured) return;
  monacoConfigured = true;

  monaco.languages.registerDocumentFormattingEditProvider(['javascript', 'typescript'], {
    async provideDocumentFormattingEdits(model) {
      return [
        {
          range: model.getFullModelRange(),
          text: await formatCode(model.getValue()),
        },
      ];
    },
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });

  monaco.editor.defineTheme(themeName, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    },
  });

  monaco.editor.setTheme(themeName);
}

const useSetupMonaco = () => {
  return {
    registerSetup: setupMonaco,
    formatCode,
  };
};

export default useSetupMonaco;
