import styled from '@emotion/styled';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EditorState, LexicalEditor } from 'lexical';
import React, { MutableRefObject, ReactNode, useCallback, useEffect, useRef } from 'react';

import { SharedHistoryContext } from './context/shared-history-context';
import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

interface PromptEditorProps {
  placeholder?: string;
  editorState?: string;
  children?: ReactNode;
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
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
  autoFocus = true,

  editorState,
  children,

  ...props
}: PromptEditorProps): JSX.Element {
  const initialConfig = {
    editorState,
    editable,
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
        <EditorShell
          useRoleNode={useRoleNode}
          useVariableNode={useVariableNode}
          autoFocus={autoFocus}
          isDebug={isDebug}
          editable={editable}
          {...props}>
          {children}
        </EditorShell>
      </SharedHistoryContext>
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
}: Omit<PromptEditorProps, 'editorState'>) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(editable ?? true);
  }, [editable]);

  const shellRef = useRef<HTMLDivElement>(null);
  const onShellClick = useCallback((e: React.MouseEvent) => {
    if (e.target === shellRef.current) {
      editor.focus();
    }
  }, []);

  return (
    <EditorRoot className="be-shell" ref={shellRef} onClick={onShellClick}>
      <Editor
        autoFocus={autoFocus}
        onChange={onChange}
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

const EditorRoot = styled.div``;
