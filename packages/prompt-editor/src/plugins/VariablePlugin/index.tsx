import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { useDebounceFn } from 'ahooks';
import {
  $getNodeByKey,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  LexicalEditor,
  createCommand,
} from 'lexical';
import { useEffect } from 'react';

import VariablePopover from './popover';
import useTransformVariableNode from './user-transform-node';
import { $createVariableNode, VariableTextNode } from './variable-text-node';

export const INSERT_VARIABLE_COMMAND: LexicalCommand<{ name: string }> = createCommand('INSERT_VARIABLE_COMMAND');

export default function VarContextPlugin({
  popperElement,
  variables,
  onChangeVariableNode,
}: {
  variables?: string[];
  popperElement?: ({
    text,
    editor,
    handleClose,
  }: {
    text: string;
    editor: LexicalEditor;
    handleClose: () => any;
  }) => any;
  onChangeVariableNode?: ({
    editor,
    element,
    node,
  }: {
    editor: LexicalEditor;
    element: HTMLElement;
    node: VariableTextNode;
  }) => void;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<{ name: string }>(
        INSERT_VARIABLE_COMMAND,
        (payload) => {
          const node = $createVariableNode(`{{ ${payload.name} }}`);
          $insertNodes([node]);

          if (!payload?.name?.trim()) {
            node.select(3, 3);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR
      )
    );
  }, [editor]);

  const inputChange = useDebounceFn(
    async (editor: LexicalEditor) => {
      editor.getEditorState().read(() => {
        const root = editor.getRootElement();
        if (!root) return;

        const textNodes = root.querySelectorAll('[data-lexical-variable]');
        textNodes.forEach((variableElement) => {
          const key = variableElement.getAttribute('data-lexical-key');
          if (!key) return;

          const element: null | HTMLElement = editor.getElementByKey(key);
          const node = $getNodeByKey(key);

          if (element && node && node instanceof VariableTextNode) {
            onChangeVariableNode?.({ editor, element, node });
          }
        });
      });
    },
    { wait: 500, trailing: true }
  );

  useEffect(() => {
    if (!editor.hasNodes([VariableTextNode])) {
      throw new Error('VarContextPlugin: VariableTextNode not registered on editor');
    }

    // 当编辑器的 VariableTextNode 节点发生变化时
    const unregisterMutationListener = editor.registerMutationListener(VariableTextNode, () => {
      inputChange.run(editor);
    });

    return () => {
      unregisterMutationListener();
    };
  }, [editor]);

  useEffect(() => {
    // 立即执行一次，确保当前状态反映
    inputChange.run(editor);
  }, [variables]);

  useTransformVariableNode(editor);

  return <VariablePopover popperElement={popperElement} />;
}
