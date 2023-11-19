import Editor, { EditorProps, useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';

function CodeEditor({ readOnly, ...props }: { readOnly: boolean } & EditorProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('customTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': 'rgba(0, 0, 0, 0.03)',
        },
      });
    }
  }, [monaco]);

  return (
    <Editor
      {...props}
      height="120px"
      theme="customTheme"
      options={{
        lineNumbersMinChars: 2,
        minimap: { enabled: false },
        readOnly,
        tabSize: 2,
        insertSpaces: true,
      }}
    />
  );
}

export default CodeEditor;
