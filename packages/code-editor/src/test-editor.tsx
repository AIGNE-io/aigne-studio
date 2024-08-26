/* eslint-disable @typescript-eslint/naming-convention */
import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect } from 'react';
import { createHighlighter } from 'shiki';

import { shikiToMonaco } from './libs/shiki-to-monaco';

function ShikiMonacoEditor({ language = 'javascript', theme = 'red', ...props }: any) {
  const monaco = useMonaco();

  const handleEditorWillMount = (_editor: any, monaco: any) => {
    createHighlighter({
      themes: [theme],
      langs: [language],
    }).then((highlighter) => {
      shikiToMonaco(highlighter, monaco);
    });
  };

  useEffect(() => {
    if (monaco && theme) {
      createHighlighter({
        themes: [theme],
        langs: [language],
      }).then((highlighter) => {
        shikiToMonaco(highlighter, monaco);
      });
    }
  }, [monaco, theme]);

  return <Editor language={language} onMount={handleEditorWillMount} {...props} />;
}

export default ShikiMonacoEditor;
