import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  KEY_DOWN_COMMAND,
  LexicalCommand,
  createCommand,
} from 'lexical';
import { useEffect } from 'react';

import { IS_APPLE } from '../../utils/environment';
import { $createRoleSelectNode, $isRoleSelectNode, RoleSelectNode } from './role-select-node';

const DELETE_CODE = ['Backspace', 'Delete'].map((key) => {
  return key.toLocaleLowerCase();
});

const isDeleteCode = ({ code }: { code: string }) => {
  return DELETE_CODE.includes(code.toLocaleLowerCase());
};

const isSelectAllCode = ({ keyCode, metaKey, ctrlKey }: { keyCode: number; metaKey: boolean; ctrlKey: boolean }) => {
  return keyCode === 65 && (IS_APPLE ? metaKey : ctrlKey);
};

export const INSERT_ROLE_SELECT_COMMAND: LexicalCommand<string> = createCommand('INSERT_ROLE_SELECT_COMMAND');

export default function RoleSelectPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  const getRoleSelectChildren = () => {
    const root = $getRoot();

    const p = root?.getFirstChild?.();
    if (!p) {
      return null;
    }

    const children = p?.getFirstChild?.();
    if (!children) {
      return null;
    }

    if (!$isRoleSelectNode(children)) {
      return null;
    }

    return children;
  };

  useEffect(() => {
    if (!editor.hasNodes([RoleSelectNode])) {
      throw new Error('RoleSelectPlugin: RoleSelectNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<string>(
        INSERT_ROLE_SELECT_COMMAND,
        (payload) => {
          const roleSelectNode = $createRoleSelectNode(payload);
          $insertNodeToNearestRoot(roleSelectNode);

          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            try {
              const node = selection.anchor.getNode();
              const prev = node.getPreviousSibling();

              const children = getRoleSelectChildren();
              if (!children) {
                return true;
              }

              // 处理删除键
              if (isDeleteCode(event)) {
                const checkPrevNode = !prev || $isRoleSelectNode(prev);
                const anchor = checkPrevNode && selection.anchor.offset === 0;

                if (anchor && selection.anchor.is(selection.focus)) {
                  event.preventDefault();
                }
              }

              return true;
            } catch (error) {
              console.error(error);
              return false;
            }
          }

          return false;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerUpdateListener(({ editorState }) => {
        const selection = editorState.read($getSelection);

        if (!$isRangeSelection(selection)) {
          return;
        }

        editor.update(() => {
          const children = getRoleSelectChildren();
          if (!children) {
            // 如果不存在节点，创建节点
            const root = $getRoot();
            const children = root.getFirstChild();
            const paragraph = $createParagraphNode();
            paragraph.append($createRoleSelectNode('system'));

            if (children === null) {
              root.append(paragraph);
            } else {
              children.replace(paragraph);
            }

            return;
          }

          if (selection.anchor.is(selection.focus)) {
            const anchorNode = selection.anchor.getNode();
            const isRoot = $isRootNode(anchorNode.getParent());

            if (isRoot && selection.anchor.offset <= 1) {
              const next = children.getNextSibling();
              if (next?.select) {
                next?.select(0, 0);
              } else {
                const text = $createTextNode(String.fromCharCode(0xfeff));
                text?.select(0, 0);
                children.insertAfter(text);
              }
            }
          }
        });
      }),
      editor.registerCommand<KeyboardEvent>(
        KEY_DOWN_COMMAND,
        (event) => {
          // 处理全选键位
          if (isSelectAllCode(event)) {
            event.preventDefault();

            editor.update(() => {
              const selection = $getSelection();

              if ($isRangeSelection(selection)) {
                const root = $getRoot();
                const p = root?.getFirstChild?.();

                if (p && $isParagraphNode(p)) {
                  const lastDescendant = p.getLastDescendant();
                  let firstDescendant = p.getFirstDescendant();
                  if ($isRoleSelectNode(firstDescendant)) {
                    firstDescendant = firstDescendant.getNextSibling();
                  }

                  const { anchor, focus } = selection;
                  if (firstDescendant && lastDescendant) {
                    anchor.set(firstDescendant.getKey(), 0, 'text');
                    focus.set(lastDescendant.getKey(), lastDescendant.getTextContentSize(), 'text');
                  }
                }
              }
            });

            return false;
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor]);

  return null;
}
