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
    action,
  }: {
    editor: LexicalEditor;
    element: HTMLElement;
    node: VariableTextNode;
    action: 'style' | 'variableChange' | 'inputChange';
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

  function updateNode(editor: LexicalEditor, action: 'style' | 'variableChange' | 'inputChange') {
    editor.getEditorState().read(() => {
      const root = editor.getRootElement();
      if (!root) return;

      const textNodes = root.querySelectorAll('[data-lexical-variable]');
      for (const textNode of textNodes) {
        const key = textNode.getAttribute('data-lexical-key');
        if (!key) continue;

        const element: null | HTMLElement = editor.getElementByKey(key);
        if (!element) continue;

        const node = $getNodeByKey(key);
        if (!node || !(node instanceof VariableTextNode)) continue;

        onChangeVariableNode?.({ editor, element, node, action });
      }
    });
  }

  const inputChange = useDebounceFn((d) => updateNode(d, 'variableChange'), { wait: 500, trailing: true });

  useEffect(() => {
    if (!editor.hasNodes([VariableTextNode])) {
      throw new Error('VarContextPlugin: VariableTextNode not registered on editor');
    }

    // 当编辑器的 VariableTextNode 节点发生变化时
    const unregisterMutationListener = editor.registerMutationListener(VariableTextNode, (mutatedNodes) => {
      editor.getEditorState().read(() => {
        for (const [nodeKey] of mutatedNodes) {
          const element = editor.getElementByKey(nodeKey);
          if (!element) continue;

          const node = $getNodeByKey(nodeKey);
          if (!node || !(node instanceof VariableTextNode)) continue;

          onChangeVariableNode?.({ editor, element, node, action: 'inputChange' });
        }
      });

      updateNode(editor, 'style');
    });

    return () => {
      unregisterMutationListener();
    };
  }, [editor]);

  useEffect(() => {
    // 更新样式
    updateNode(editor, 'style');

    inputChange.run(editor);
  }, [variables]);

  useTransformVariableNode(editor);

  return <VariablePopover popperElement={popperElement} />;
}
