import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
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
import { extractBracketContent } from './utils/util';
import { $createVariableNode, VariableTextNode, textStyle, variableStyle } from './variable-text-node';

export const INSERT_VARIABLE_COMMAND: LexicalCommand<{ name: string }> = createCommand('INSERT_VARIABLE_COMMAND');

export default function VarContextPlugin({
  popperElement,
  variables,
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

  useEffect(() => {
    if (!editor.hasNodes([VariableTextNode])) {
      throw new Error('VarContextPlugin: VariableTextNode not registered on editor');
    }

    return mergeRegister(
      editor.registerMutationListener(VariableTextNode, (mutations) => {
        editor.getEditorState().read(() => {
          for (const [key] of mutations) {
            const element: null | HTMLElement = editor.getElementByKey(key);
            const node = $getNodeByKey(key);

            if (element && node) {
              const text = extractBracketContent(element.textContent || '') || '';
              const variable = (text || '').split('.')[0] || '';
              const isVariable = (variables || []).includes(variable);
              element.style.cssText = isVariable ? variableStyle : textStyle;
            }
          }
        });
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, variables]);

  useTransformVariableNode(editor, variables);

  return <VariablePopover popperElement={popperElement} />;
}
