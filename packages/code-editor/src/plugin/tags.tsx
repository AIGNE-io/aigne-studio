import { Monaco } from '@monaco-editor/react';

function registerJsxTagCloser(monaco: Monaco, language: 'typescript' | 'javascript') {
  monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: ['>'],
    provideCompletionItems: (model, position) => {
      const codePre: string = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const tag = codePre.match(/.*<(\w+)>$/)?.[1];

      if (!tag) {
        return {
          suggestions: [],
        };
      }

      const word = model.getWordUntilPosition(position);

      return {
        suggestions: [
          {
            label: `</${tag}>`,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: `$1</${tag}>`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
          },
        ],
      };
    },
  });
}

const useJsxTagCloser = () => {
  const onMount = (monaco: Monaco) => {
    registerJsxTagCloser(monaco, 'typescript');
    registerJsxTagCloser(monaco, 'javascript');
  };

  return {
    registerJsxTagCloser: onMount,
  };
};

export default useJsxTagCloser;
