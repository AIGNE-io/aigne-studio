import styled from '@emotion/styled';
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Box, BoxProps } from '@mui/material';
import { EditorState, LexicalEditor } from 'lexical';
import React, { ComponentProps, MutableRefObject, ReactNode, useCallback, useEffect, useRef } from 'react';

import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import ComponentPickerMenuPlugin from './plugins/ComponentPickerPlugin';
import VariablePickerPlugin from './plugins/VariablePickerPlugin';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

export type { EditorState } from 'lexical';

interface PromptEditorProps extends Omit<BoxProps, 'value' | 'onChange'> {
  placeholder?: string;
  children?: ReactNode;
  value?: EditorState;
  onChange?: (value: EditorState) => void;
  useRoleNode?: boolean;
  useVariableNode?: boolean;
  isDebug?: boolean;
  editable?: boolean;
  editorRef?: React.RefCallback<LexicalEditor> | MutableRefObject<LexicalEditor | null>;
  autoFocus?: boolean;
  componentPickerProps?: ComponentProps<typeof ComponentPickerMenuPlugin>;
  variablePickerProps: ComponentProps<typeof VariablePickerPlugin>;
}

export default function PromptEditor({
  useRoleNode = false,
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
        useRoleNode={useRoleNode}
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
  useRoleNode,
  useVariableNode,
  placeholder,
  isDebug,
  children,
  editable,
  onChange,
  editorRef,
  autoFocus,
  componentPickerProps,
  variablePickerProps,
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
    <EditorRoot {...props} className={`editor-shell ${props?.className || ''}`} ref={shellRef} onClick={onShellClick}>
      <Editor
        autoFocus={autoFocus}
        onChange={setState}
        placeholder={placeholder}
        editorRef={editorRef}
        useRoleNode={useRoleNode}
        useVariableNode={useVariableNode}
        isDebug={isDebug}
        variablePickerProps={variablePickerProps}
        componentPickerProps={componentPickerProps}>
        {children}
      </Editor>
    </EditorRoot>
  );
}

const EditorRoot = styled(Box)`
  position: relative;
`;
