/* eslint-disable @typescript-eslint/naming-convention */
import Editor, { EditorProps } from '@monaco-editor/react';

// Editor 类型与 ReactComponent 不兼容
const MonacoEditor = Editor as unknown as React.ComponentType<EditorProps>;

function TestCodeEditor({ language = 'javascript', ...props }: EditorProps) {
  return <MonacoEditor language={language} {...props} />;
}

export default TestCodeEditor;
