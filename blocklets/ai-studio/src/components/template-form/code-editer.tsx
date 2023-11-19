import styled from '@emotion/styled';
import Editor, { EditorProps, useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';

function CodeEditor({ readOnly, ...props }: { readOnly?: boolean } & EditorProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('customTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#F2F2F2',
        },
      });
      monaco.editor.setTheme('customTheme');
    }
  }, [monaco]);

  return (
    <CodeEditorContainer
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

const CodeEditorContainer = styled(Editor)`
  border-radius: 4px;
  overflow: hidden;
`;
