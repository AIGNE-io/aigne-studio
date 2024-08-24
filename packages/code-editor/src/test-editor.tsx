/* eslint-disable @typescript-eslint/naming-convention */
import Editor from '@monaco-editor/react';
// import { setMonacoTheme } from '@shikijs/monaco';

function ShikiMonacoEditor({ language = 'javascript', theme = 'red', ...props }: any) {
  const handleEditorWillMount = async () => {};

  return <Editor language={language} theme={theme} beforeMount={handleEditorWillMount} {...props} />;
}

export default ShikiMonacoEditor;
