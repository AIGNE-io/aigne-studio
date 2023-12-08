import styled from '@emotion/styled';
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Box, BoxProps } from '@mui/material';
import { EditorState, LexicalEditor } from 'lexical';
import React, { ComponentProps, MutableRefObject, ReactNode, useCallback, useEffect, useRef } from 'react';

import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import ComponentPickerMenuPlugin from './plugins/ComponentPickerPlugin';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

export type { EditorState } from 'lexical';

interface PromptEditorProps extends Omit<BoxProps, 'value' | 'onChange'> {
  placeholder?: string;
  children?: ReactNode;
  value?: EditorState;
  onChange?: (value: EditorState) => void;
  useVariableNode?: boolean;
  isDebug?: boolean;
  editable?: boolean;
  editorRef?: React.RefCallback<LexicalEditor> | MutableRefObject<LexicalEditor | null>;
  autoFocus?: boolean;
  componentPickerProps?: ComponentProps<typeof ComponentPickerMenuPlugin>;
  ContentProps?: BoxProps;
}

export default function PromptEditor({
  useVariableNode = true,
  isDebug = false,
  editable = true,
  autoFocus = false,
  children,
  ...props
}: PromptEditorProps): JSX.Element {
  const initialConfig: InitialConfigType = {
    editable,
    editorState: props.value,
    namespace: 'PromptEditor',
    nodes: [...PromptEditorNodes],
    onError: (error: Error) => {
      throw error;
    },
    theme: PromptEditorEditorTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorShell
        useVariableNode={useVariableNode}
        autoFocus={autoFocus}
        isDebug={isDebug}
        editable={editable}
        {...props}>
        {children}
      </EditorShell>
    </LexicalComposer>
  );
}

function EditorShell({
  useVariableNode,
  placeholder,
  isDebug,
  children,
  editable,
  onChange,
  editorRef,
  autoFocus,
  componentPickerProps,
  ContentProps,
  ...props
}: PromptEditorProps) {
  const [editor] = useLexicalComposerContext();

  const stateRef = useRef(props.value);

  useEffect(() => {
    if (props.value && stateRef.current !== props.value) {
      stateRef.current = props.value;
      setTimeout(() => editor.setEditorState(props.value!));
    }
  }, [editor, props.value]);

  const setState = useCallback(
    (s: EditorState) => {
      if (!editable) return;

      if (stateRef.current !== s) {
        stateRef.current = s;
        onChange?.(s);
      }
    },
    [onChange, editable]
  );

  useEffect(() => {
    editor.setEditable(editable ?? true);
  }, [editable, editor]);

  const shellRef = useRef<HTMLDivElement>(null);

  const onShellClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === shellRef.current) {
        editor.focus();
      }
    },
    [editor]
  );

  return (
    <EditorRoot {...props} ref={shellRef} onClick={onShellClick}>
      <Editor
        autoFocus={autoFocus}
        onChange={setState}
        placeholder={placeholder}
        editorRef={editorRef}
        useVariableNode={useVariableNode}
        isDebug={isDebug}
        componentPickerProps={componentPickerProps}
        ContentProps={ContentProps}>
        {children}
      </Editor>
    </EditorRoot>
  );
}

const EditorRoot = styled(Box)`
  position: relative;
`;
