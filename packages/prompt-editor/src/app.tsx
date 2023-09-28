import styled from '@emotion/styled';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createParagraphNode, $createTextNode, $getRoot, EditorState, LexicalEditor } from 'lexical';
import React, { MutableRefObject, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';

import { SharedHistoryContext } from './context/shared-history-context';
import Editor from './editor';
import PromptEditorNodes from './nodes/prompt-editor-nodes';
import { $createRoleSelectNode } from './plugins/RolePlugin/role-select-node';
import PromptEditorEditorTheme from './themes/prompt-editor-theme';

function EmptyEditor(isRole: boolean) {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const paragraph = $createParagraphNode();

    if (isRole) {
      paragraph.append($createRoleSelectNode('system'));
    } else {
      const text = $createTextNode(String.fromCharCode(0xfeff));
      paragraph.append(text);
    }

    root.append(paragraph);
  }
}

interface PromptEditorProps {
  placeholder?: string;
  value?: string;
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

  value,
  children,

  ...props
}: PromptEditorProps): JSX.Element {
  const editorState = useMemo(() => {
    if (value) {
      try {
        JSON.parse(value);
        return value;
      } catch (error) {
        return () => EmptyEditor(useRoleNode);
      }
    }

    return () => EmptyEditor(useRoleNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRoleNode]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  const shellRef = useRef<HTMLDivElement>(null);
  const onShellClick = useCallback((e: React.MouseEvent) => {
    if (e.target === shellRef.current) {
      editor.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EditorRoot className="editor-shell" ref={shellRef} onClick={onShellClick}>
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

const EditorRoot = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.23);
  background: #fff;
  padding: 8.5px 14px;
  border-radius: 4px;
  position: relative;
`;
