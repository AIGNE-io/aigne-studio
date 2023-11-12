import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $getRoot, $getSelection, $isParagraphNode, $isRangeSelection, LexicalCommand, createCommand } from 'lexical';
import { useEffect } from 'react';

import { $createRoleSelectNode, $isRoleSelectNode, RoleSelectNode } from './role-select-node';

export const INSERT_ROLE_SELECT_COMMAND: LexicalCommand<string> = createCommand('INSERT_ROLE_SELECT_COMMAND');

export default function RoleSelectPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([RoleSelectNode])) {
      throw new Error('RoleSelectPlugin: RoleSelectNode not registered on editor');
    }

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChild();
          if (!$isParagraphNode(paragraph)) return;
          const role = paragraph.getChildren().find((i): i is RoleSelectNode => $isRoleSelectNode(i));
          const first = paragraph.getFirstChild();
          if (role !== first) {
            editor.update(() => {
              const r = role ?? $createRoleSelectNode('user');
              if (first) {
                first.insertBefore(r);
              } else {
                paragraph.append(r);
              }
            });
          }

          const selection = $getSelection();
          if ($isRangeSelection(selection) && selection.isCollapsed() && selection.anchor.offset === 0) {
            const role = selection.getNodes()[0];
            if ($isRoleSelectNode(role)) {
              editor.update(() => {
                role.selectNext(0, 0);
              });
            }
          }
        });
      })
    );
  }, [editor]);

  return null;
}
