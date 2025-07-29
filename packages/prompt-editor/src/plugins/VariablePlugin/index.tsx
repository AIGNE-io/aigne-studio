import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { useDebounceFn } from 'ahooks';
import {
  $getNodeByKey,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  LexicalEditor,
  TextNode,
  createCommand,
} from 'lexical';
import { useEffect, type JSX } from 'react';

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
    node: TextNode;
    action: 'style' | 'variableChange' | 'inputChange';
  }) => void;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const variableStr = (variables || [])?.join(',') || '';

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

  function updateNode(editor: LexicalEditor, action: 'style' | 'variableChange') {
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

        const prevNode = node.getPreviousSibling();
        const nextNode = node.getNextSibling();

        if (prevNode && prevNode instanceof TextNode) {
          const prevText = prevNode.getTextContent();
          if (prevText.trim().endsWith('{')) {
            editor.update(() => prevNode.setTextContent(prevText.replace(/\s*\{+\s*$/, '')));
          }
        }

        if (nextNode && nextNode instanceof TextNode) {
          const nextText = nextNode.getTextContent();
          if (nextText.trim().startsWith('}')) {
            editor.update(() => nextNode.setTextContent(nextText.replace(/^\s*\}+\s*/, '')));
          }
        }

        onChangeVariableNode?.({ editor, element, node, action });
      }
    });
  }

  const variableChange = useDebounceFn((d) => updateNode(d, 'variableChange'), { wait: 500, trailing: true });
  const styleChange = useDebounceFn((d) => updateNode(d, 'style'), { wait: 0, trailing: true });

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

      styleChange.run(editor);
    });

    return () => {
      unregisterMutationListener();
    };
  }, [editor]);

  useEffect(() => {
    styleChange.run(editor);
    variableChange.run(editor);
  }, [variableStr]);

  useTransformVariableNode(editor);

  return <VariablePopover popperElement={popperElement} />;
}
