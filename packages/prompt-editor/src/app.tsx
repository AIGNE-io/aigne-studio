import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

import { SharedHistoryContext } from './context/shared-history-context';
import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import { $createRoleSelectNode } from './plugins/RolePlugin/role-select-node';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

function customText() {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const paragraph = $createParagraphNode();
    paragraph.append(
      $createRoleSelectNode('system'),
      $createTextNode('The playground is a demo environment built with ')
    );

    root.append(paragraph);
  }
}

function App(): JSX.Element {
  const initialConfig = {
    editorState: customText,
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
          <Editor useRole useVariable />
        </div>
      </SharedHistoryContext>
    </LexicalComposer>
  );
}

export default function PromptEditorApp(): JSX.Element {
  return <App />;
}
