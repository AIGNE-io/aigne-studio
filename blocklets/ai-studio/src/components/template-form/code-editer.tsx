import Editor, { EditorProps, useMonaco } from '@monaco-editor/react';
import { Box, styled } from '@mui/material';
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
    <CodeEditorContainer>
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
        className="editor-content"
      />
    </CodeEditorContainer>
  );
}

export default CodeEditor;

const CodeEditorContainer = styled(Box)`
  .editor-content {
    overflow: hidden;
    border-radius: ${({ theme }) => theme.shape.borderRadius / 2}px;
  }
`;
