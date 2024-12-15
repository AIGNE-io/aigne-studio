import { Monaco } from '@monaco-editor/react';

import type { EditorInstance } from '../libs/type';

// @ts-ignore
// eslint-disable-next-line import/extensions
// import reactRaw from '../types/index.d.ts?raw';

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

const usePrettier = () => {
  const registerPrettier = async (
    _editor: EditorInstance,
    monaco: Monaco,
    options: { theme?: string; typeScriptNoValidation?: boolean }
  ) => {
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
      noSyntaxValidation: options?.typeScriptNoValidation ?? true,
    });

    if (options?.theme) {
      monaco.editor.setTheme(options.theme);
    }

    // https://github.com/microsoft/monaco-editor/issues/264#issuecomment-654578687
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // monaco.languages.typescript.typescriptDefaults.addExtraLib(reactRaw, 'file:///node_modules/@types/react.d.ts');
  };

  return {
    registerPrettier,
  };
};

export default usePrettier;
