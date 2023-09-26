import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { LexicalEditor } from 'lexical';
import { useEffect, useState } from 'react';

import { useSharedHistoryContext } from './context/shared-history-context';
import CommentPlugin from './plugins/CommentPlugin';
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin';
import RoleSelectPlugin from './plugins/RolePlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import VariablePlugin from './plugins/VariablePlugin';
import ContentEditable from './ui/content-editable';
import Placeholder from './ui/content-placeholder';
import { CAN_USE_DOM } from './utils/environment';

export default function Editor({
  useRole = false,
  useVariable = false,
}: {
  useRole: boolean;
  useVariable: boolean;
}): JSX.Element {
  const text = 'Enter some plain text...';
  const placeholder = <Placeholder>{text}</Placeholder>;
  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const { historyState } = useSharedHistoryContext();

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport = CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  const fns = ({ editor }: { editor: LexicalEditor }) => {
    return (
      <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="popup-item spaced insert-comment"
          onClick={() => {
            editor.getEditorState().read(() => {});
          }}
          aria-label="Insert comment">
          Copy
        </button>

        <button
          type="button"
          className="popup-item spaced insert-comment"
          onClick={() => {
            editor.getEditorState().read(() => {});
          }}
          aria-label="Insert comment">
          Cover to variable
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="editor-container tree-view plain-text">
        <PlainTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={placeholder}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <CommentPlugin />

      <TreeViewPlugin />
      {useRole && <RoleSelectPlugin />}
      {useVariable && <VariablePlugin />}
      <FloatingToolbarPlugin floatItems={fns} />
      <HistoryPlugin externalHistoryState={historyState} />
    </>
  );
}
