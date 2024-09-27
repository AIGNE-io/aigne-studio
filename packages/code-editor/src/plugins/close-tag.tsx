import { Monaco } from '@monaco-editor/react';

import type { EditorInstance } from '../libs/type';

const useCloseTag = () => {
  const onMount = (editor: EditorInstance, monaco: Monaco) => {
    editor.onDidChangeModelContent(() => {
      const position = editor.getPosition();
      const model = editor.getModel();
      if (!model || !position) return;

      const currentLine = model.getLineContent(position.lineNumber);
      const textBeforeCursor = currentLine.substring(0, position.column - 1);

      const match = textBeforeCursor.match(/<([a-zA-Z]+)>$/);
      if (match) {
        const tagName = match[1];
        const closingTag = `</${tagName}>`;

        const textAfterCursor = currentLine.substring(position.column - 1);
        const closingTagRegex = new RegExp(`^</${tagName}>`);

        if (closingTagRegex.test(textAfterCursor)) return;

        editor.executeEdits('', [
          {
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: closingTag,
          },
        ]);

        editor.setPosition({ lineNumber: position.lineNumber, column: position.column });
      }
    });
  };

  return {
    registerCloseTag: onMount,
  };
};

export default useCloseTag;
