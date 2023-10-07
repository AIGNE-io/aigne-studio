import { createHeadlessEditor } from '@lexical/headless';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  EditorState,
} from 'lexical';

import PromptEditorNodes from './nodes/prompt-editor-nodes';
import { $createCommentNode, $isCommentNode, COMMENT_PREFIX } from './plugins/CommentPlugin/comment-node';
import { $createRoleSelectNode, $isRoleSelectNode } from './plugins/RolePlugin/role-select-node';
import { isBracketStartAndEnd, splitText } from './plugins/VariablePlugin/utils/util';
import { $createVariableNode, $isVariableTextNode } from './plugins/VariablePlugin/variable-text-node';

interface Node {
  text: string;
  type: string;
  version: number;
  children?: Node[];
}

function getAllVariablesFn(nodes: Node[]): string[] {
  let variables: string[] = [];

  for (const node of nodes) {
    if (node.type === 'variable') {
      variables.push(node.text);
    }

    if (node.children) {
      variables = [...variables, ...getAllVariablesFn(node.children)];
    }
  }

  return variables;
}

export type Role = 'system' | 'user' | 'assistant';

export function tryParseJSONObject(str: string) {
  if (!str) {
    return false;
  }

  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object') {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

export function $text2lexical(content?: string, role?: Role): Promise<string> {
  return new Promise((resolve, reject) => {
    const editor = createHeadlessEditor({
      nodes: [...PromptEditorNodes],
      onError: (e) => reject(e),
    });

    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();
      if (role) {
        paragraph.append($createRoleSelectNode(role));
      }

      if (content) {
        const rows = content.split(/\n/);

        rows.forEach((row) => {
          if (row) {
            if (row.startsWith(COMMENT_PREFIX)) {
              paragraph.append($createCommentNode(row));
            } else {
              const list = splitText(row);
              if (list && list.length) {
                const nodes = list.filter(Boolean).map((item) => {
                  const isBracket = isBracketStartAndEnd(item);
                  if (isBracket) {
                    return $createVariableNode(item.trim());
                  }
                  return $createTextNode(item);
                });

                nodes.forEach((_node) => {
                  paragraph.append(_node);
                });
              }
            }
          }

          paragraph.append($createLineBreakNode());
        });
      }

      root.append(paragraph);
    });

    editor.registerUpdateListener(({ editorState }: { editorState: EditorState }) => {
      editorState.read(() => resolve(JSON.stringify(editorState)));
    });
  });
}

export function $lexical2text(editorState: string): Promise<{ content: string; role?: Role }> {
  // 为了触发文本变化事件
  const TEMP_TEXT = 'TEMP_TEXT';

  return new Promise((resolve, reject) => {
    const editor = createHeadlessEditor({
      nodes: [...PromptEditorNodes],
      onError: (e) => reject(e),
    });

    if (tryParseJSONObject(editorState)) {
      const editorStateStr = editor.parseEditorState(editorState);
      editor.setEditorState(editorStateStr);
    }

    let role: Role | undefined;

    editor.update(() => {
      const root = $getRoot();
      const children = root.getFirstChild();
      if (children !== null && $isParagraphNode(children)) {
        const roleNode = children.getFirstChild();
        if (roleNode !== null && $isRoleSelectNode(roleNode)) {
          role = roleNode.__text as Role;
        }

        const temp = $createTextNode(TEMP_TEXT);
        children.append(temp);
      } else {
        reject(new Error('The data format is incorrect'));
      }
    });

    editor.registerTextContentListener((textContent) => {
      resolve({ content: textContent.slice(0, -`${TEMP_TEXT.length}`).replace(/\n+/g, '\n'), role });
    });
  });
}

export function getAllVariables(editorState: string) {
  if (tryParseJSONObject(editorState)) {
    const editorStateObj = JSON.parse(editorState);
    return getAllVariablesFn(editorStateObj?.root?.children || []);
  }

  return [];
}

export { $createCommentNode, $isCommentNode };
export { $createVariableNode, $isVariableTextNode };
export { $createRoleSelectNode, $isRoleSelectNode };
export { $createParagraphNode, $createLineBreakNode, $createTextNode, $isParagraphNode, $isTextNode };
export { COMMENT_PREFIX };
