import { Monaco } from '@monaco-editor/react';
import * as MaterialUI from '@mui/material';

import type { EditorInstance } from '../libs/type';

const getAllMUIComponents = () => {
  return Object.keys(MaterialUI).filter((key) => {
    return /^[A-Z]/.test(key);
  });
};
const muiComponents = getAllMUIComponents();

let isProviderRegistered = false;
const registerMUIComponentsAutocomplete = (monaco: Monaco) => {
  if (isProviderRegistered) return;

  monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: (model, position) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const match = textUntilPosition.match(/<([A-Z][a-zA-Z]*)$/);
      if (match) {
        const word = match[1];
        if (!word) return { suggestions: [] };

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column - word.length,
          endColumn: position.column,
        };

        return {
          suggestions: muiComponents
            .filter((comp) => comp.startsWith(word))
            .map((comp) => ({
              label: comp,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: comp,
              range,
              sortText: String.fromCharCode(100),
            })),
        };
      }

      return { suggestions: [] };
    },
  });

  isProviderRegistered = true;
};

const useCloseTag = () => {
  const onMount = (editor: EditorInstance, monaco: Monaco) => {
    let lastContent = '';

    editor.onDidChangeModelContent((event) => {
      const position = editor.getPosition();
      const model = editor.getModel();
      if (!model || !position) return;

      const currentLine = model.getLineContent(position.lineNumber);

      if (event?.changes[0]?.text === '>' && currentLine !== lastContent) {
        const textBeforeCursor = currentLine.substring(0, position.column - 1);

        const match = textBeforeCursor.match(/<([a-zA-Z]+)>$/);

        if (match) {
          const tagName = match[1];
          const closingTag = `</${tagName}>`;

          const textAfterCursor = currentLine.substring(position.column - 1);
          const closingTagRegex = new RegExp(`^</${tagName}>`);

          if (!closingTagRegex.test(textAfterCursor)) {
            editor.executeEdits('', [
              {
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: closingTag,
              },
            ]);

            editor.setPosition({ lineNumber: position.lineNumber, column: position.column });
          }
        }
      }

      lastContent = currentLine;
    });

    registerMUIComponentsAutocomplete(monaco);
  };

  return {
    registerCloseTag: onMount,
  };
};

export default useCloseTag;
