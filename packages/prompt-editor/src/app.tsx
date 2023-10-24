import styled from '@emotion/styled';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Box, BoxProps } from '@mui/material';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import { $createParagraphNode, $createTextNode, $getRoot, EditorState, LexicalEditor } from 'lexical';
import React, { MutableRefObject, ReactNode, useCallback, useEffect, useRef } from 'react';

import { SharedHistoryContext } from './context/shared-history-context';
import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import { $createRoleSelectNode } from './plugins/RolePlugin/role-select-node';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';
import { $lexical2text, $text2lexical, Role } from './utils';

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
  content?: string;
  role?: Role;
  onChange?: (content: string, role: Role) => void;
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
  content,
  role,
  onChange,
  editorRef,
  autoFocus,
  ...props
}: PromptEditorProps) {
  const [editor] = useLexicalComposerContext();

  const state = useRef<EditorState>();
  const cache = useRef<{ content?: string; role?: Role }>();

  const emitChange = useThrottleFn(
    async () => {
      const json = JSON.stringify(state.current);
      const { content, role = 'user' } = await $lexical2text(json);
      if (cache.current?.content !== content || cache.current.role !== role) {
        cache.current = { content, role };
        onChange?.(content.replace(/\n+/g, '\n'), role);
      }
    },
    { wait: 500 }
  );

  const setState = useCallback(
    (s: EditorState) => {
      state.current = s;
      emitChange.run();
    },
    [emitChange]
  );

  useAsyncEffect(async () => {
    if (cache.current?.content !== content || cache.current?.role !== role) {
      cache.current = { content, role };
      const state = await $text2lexical(content, role);
      editor.setEditorState(editor.parseEditorState(state));
    }
  }, [content, role]);

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
