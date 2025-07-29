/* eslint-disable @typescript-eslint/naming-convention */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from 'lexical';
import { JSX, useEffect } from 'react';

import { IS_APPLE } from '../../utils/environment';
import replaceNodes from '../VariablePlugin/utils/replace-nodes';
import { $isVariableTextNode } from '../VariablePlugin/variable-text-node';
import { $createCommentNode, $isCommentNode, CommentNode } from './comment-node';
import useTransformVariableNode from './user-transform-node';

export function isCommentKey(keyCode: number, metaKey: boolean, ctrlKey: boolean): boolean {
  return keyCode === 191 && (IS_APPLE ? metaKey : ctrlKey);
}

export default function VarContextPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([CommentNode])) {
      throw new Error('CommentNode: CommentNode not registered on editor');
    }
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          const { keyCode, ctrlKey, metaKey } = event;
          const selection = $getSelection();

          if (isCommentKey(keyCode, metaKey, ctrlKey)) {
            if ($isRangeSelection(selection)) {
              const anchorNode = selection.anchor.getNode();
              // const focusNode = selection.focus.getNode();

              const node = $isParagraphNode(anchorNode) ? anchorNode : anchorNode;

              if ($isTextNode(node) || $isCommentNode(node) || $isVariableTextNode(node)) {
                if ($isCommentNode(node)) {
                  const text = node.getTextContent();

                  let curOffset = selection.anchor.offset - 3;

                  replaceNodes({
                    fn: (_nodes) => {
                      // 替换光标位置
                      for (let i = 0; i < _nodes.length; i++) {
                        const _node = _nodes[i];
                        if (_node) {
                          const _len = _node.getTextContentSize();

                          if (_len >= curOffset) {
                            _node.select(curOffset, curOffset);
                            break;
                          } else {
                            curOffset -= _len;
                          }
                        }
                      }
                    },
                    node,
                    text: text.slice(3),
                  });
                } else {
                  const preNodes = node.getPreviousSiblings();
                  // @ts-ignore
                  const preIndex = (preNodes || []).findLastIndex((_node: any) => {
                    return $isLineBreakNode(_node);
                  });

                  const transformPreNodes = preIndex === -1 ? preNodes : preNodes.slice(preIndex + 1);

                  const len = transformPreNodes.reduce((pre, cur) => {
                    return pre + cur.getTextContentSize();
                  }, 0);

                  const newOffset = len + selection.anchor.offset + 3;

                  const nextNodes = node.getNextSiblings();
                  const index = nextNodes.findIndex((_node) => {
                    return $isLineBreakNode(_node);
                  });
                  const transformNextNodes = index === -1 ? nextNodes : nextNodes.slice(0, index);

                  const nodes = [...transformPreNodes, node, ...transformNextNodes];

                  const texts = nodes
                    .map((_node) => {
                      return _node.getTextContent();
                    })
                    .join('');

                  // 替换当前节点，其他节点全部删除
                  for (let j = 0; j < nodes.length; j++) {
                    const _node = nodes[j];
                    if (_node) {
                      if (j === 0) {
                        const newNode = $createCommentNode(`// ${texts}`);
                        _node.replace(newNode);
                        // 替换光标位置
                        newNode.select(newOffset, newOffset);
                      } else {
                        _node.remove();
                      }
                    }
                  }
                }

                return true;
              }
            }
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor]);

  useTransformVariableNode(editor);

  return null;
}
