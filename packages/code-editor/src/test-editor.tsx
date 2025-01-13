/* eslint-disable @typescript-eslint/naming-convention */
import Editor from '@monaco-editor/react';

function TestCodeEditor({ language = 'javascript', ...props }: any) {
  return <Editor language={language} {...props} />;
}

export default TestCodeEditor;
