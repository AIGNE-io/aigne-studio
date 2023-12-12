import './index.css';

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { BoxProps } from '@mui/material';
import { EditorState, LexicalEditor } from 'lexical';
import { ComponentProps, MutableRefObject } from 'react';

import CommentPlugin from './plugins/CommentPlugin';
import ComponentPickerMenuPlugin from './plugins/ComponentPickerPlugin';
import FloatingToolbarPlugin from './plugins/FloatingToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import VariablePickerPlugin from './plugins/VariablePickerPlugin';
import VariablePlugin from './plugins/VariablePlugin';
import ContentEditable from './ui/content-editable';
import Placeholder from './ui/content-placeholder';

export default function Editor({
  useVariableNode = false,
  isDebug = false,
  floatElement,
  children,
  placeholder,
  onChange,
  autoFocus = true,
  editorRef,
  popperElement,
  componentPickerProps,
  variablePickerProps,
  ContentProps,
  variables,
}: {
  useVariableNode?: boolean;
  isDebug?: boolean;
  floatElement?: (data: { editor: LexicalEditor }) => any;
  children: any;
  placeholder?: string;
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
  autoFocus?: boolean;
  editorRef?: React.RefCallback<LexicalEditor> | MutableRefObject<LexicalEditor | null>;
  popperElement?: (editor: LexicalEditor) => any;
  componentPickerProps?: ComponentProps<typeof ComponentPickerMenuPlugin>;
  variablePickerProps?: ComponentProps<typeof VariablePickerPlugin>;
  ContentProps?: BoxProps;
  variables?: string[];
}): JSX.Element {
  const placeholderNode = <Placeholder>{placeholder}</Placeholder>;

  return (
    <>
      <PlainTextPlugin
        contentEditable={<ContentEditable {...ContentProps} />}
        placeholder={placeholderNode}
        ErrorBoundary={LexicalErrorBoundary}
      />

      <CommentPlugin />
      {autoFocus && <AutoFocusPlugin />}
      {isDebug && <TreeViewPlugin />}
      {useVariableNode && <VariablePlugin popperElement={popperElement} />}
      <FloatingToolbarPlugin floatElement={floatElement} />
      {componentPickerProps && <ComponentPickerMenuPlugin {...componentPickerProps} />}
      <HistoryPlugin />
      {onChange && <OnChangePlugin onChange={onChange} ignoreSelectionChange />}
      {editorRef !== undefined && <EditorRefPlugin editorRef={editorRef} />}
      {variablePickerProps && <VariablePickerPlugin {...variablePickerProps} />}

      {children}
    </>
  );
}
