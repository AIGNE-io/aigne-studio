import styled from '@emotion/styled';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Box, BoxProps } from '@mui/material';
import { $createParagraphNode, $createTextNode, $getRoot, EditorState, LexicalEditor } from 'lexical';
import React, { MutableRefObject, ReactNode, useCallback, useEffect, useRef } from 'react';

import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import { $createRoleSelectNode } from './plugins/RolePlugin/role-select-node';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

export type { EditorState } from 'lexical';

export function defaultValue(isRole: boolean = true) {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const paragraph = $createParagraphNode();

    if (isRole) {
      const role = $createRoleSelectNode('system');
      paragraph.append(role);
    } else {
      const text = $createTextNode(' ');
      paragraph.append(text);
    }

    root.append(paragraph);
  }
}

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
}

export default function PromptEditor({
  useRoleNode = true,
  useVariableNode = true,
  isDebug = false,
  editable = true,
  autoFocus = false,
  children,
  ...props
}: PromptEditorProps): JSX.Element {
  const initialConfig = {
    editable,
    defaultValue: props.value,
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
  ...props
}: PromptEditorProps) {
  const [editor] = useLexicalComposerContext();

  const stateRef = useRef<EditorState>();

  useEffect(() => {
    if (props.value && stateRef.current !== props.value) {
      stateRef.current = props.value;
      setTimeout(() => editor.setEditorState(props.value!));
    }
  }, [props.value]);

  const setState = useCallback(
    (s: EditorState) => {
      stateRef.current = s;
      onChange?.(s);
    },
    [onChange]
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
    <EditorRoot {...props} className={`editor-shell ${props.className}`} ref={shellRef} onClick={onShellClick}>
      <Editor
        autoFocus={autoFocus}
        onChange={setState}
        placeholder={placeholder}
        editorRef={editorRef}
        useRoleNode={useRoleNode}
        useVariableNode={useVariableNode}
        isDebug={isDebug}>
        {children}
      </Editor>
    </EditorRoot>
  );
}

const EditorRoot = styled(Box)`
  position: relative;
`;
