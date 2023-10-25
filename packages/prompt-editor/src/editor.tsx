import './index.css';

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { EditorState, LexicalEditor } from 'lexical';
import { MutableRefObject } from 'react';

import CommentPlugin from './plugins/CommentPlugin';
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin';
import RoleSelectPlugin from './plugins/RolePlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import VariablePlugin from './plugins/VariablePlugin';
import ContentEditable from './ui/content-editable';
import Placeholder from './ui/content-placeholder';

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
  const placeholderNode = <Placeholder>{placeholder}</Placeholder>;

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
      <HistoryPlugin />
      {onChange && <OnChangePlugin onChange={onChange} />}
      {editorRef !== undefined && <EditorRefPlugin editorRef={editorRef} />}

      {children}
    </>
  );
}
