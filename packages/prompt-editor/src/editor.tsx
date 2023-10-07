import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { EditorState, LexicalEditor } from 'lexical';
import { MutableRefObject, useEffect, useState } from 'react';

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
  useRoleNode = false,
  useVariableNode = false,
  isDebug = false,
  floatElement,
  children,
  placeholder,
  onChange,
  autoFocus = true,
  editorRef,
  popperElement,
}: {
  useRoleNode?: boolean;
  useVariableNode?: boolean;
  isDebug?: boolean;
  floatElement?: (data: { editor: LexicalEditor }) => any;
  children: any;
  placeholder?: string;
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
  autoFocus?: boolean;
  editorRef?: React.RefCallback<LexicalEditor> | MutableRefObject<LexicalEditor | null>;
  popperElement?: (editor: LexicalEditor) => any;
}): JSX.Element {
  const text = 'Enter some plain text...';
  const placeholderNode = <Placeholder>{placeholder || text}</Placeholder>;
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

  return (
    <>
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={placeholderNode}
        ErrorBoundary={LexicalErrorBoundary}
      />

      <CommentPlugin />
      {autoFocus && <AutoFocusPlugin />}
      {isDebug && <TreeViewPlugin />}
      {useRoleNode && <RoleSelectPlugin />}
      {useVariableNode && <VariablePlugin popperElement={popperElement} />}
      <FloatingToolbarPlugin floatElement={floatElement} />
      <HistoryPlugin externalHistoryState={historyState} />
      {onChange && <OnChangePlugin onChange={onChange} />}
      {editorRef !== undefined && <EditorRefPlugin editorRef={editorRef} />}

      {children}
    </>
  );
}
