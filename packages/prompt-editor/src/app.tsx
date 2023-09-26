import { LexicalComposer } from '@lexical/react/LexicalComposer';

import { SharedHistoryContext } from './context/shared-history-context';
import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

export default function PromptEditor({
  editorState,
  useRoleNode = true,
  useVariableNode = true,
  DEBUG = false,
}: {
  editorState: any;
  useRoleNode?: boolean;
  useVariableNode?: boolean;
  DEBUG?: boolean;
}): JSX.Element {
  const initialConfig = {
    editorState,
    namespace: 'PromptEditor',
    nodes: [...PromptEditorNodes],
    onError: (error: Error) => {
      throw error;
    },
    theme: PromptEditorEditorTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SharedHistoryContext>
        <div className="editor-shell">
          <Editor useRole={useRoleNode} useVariable={useVariableNode} DEBUG={DEBUG} />
        </div>
      </SharedHistoryContext>
    </LexicalComposer>
  );
}
