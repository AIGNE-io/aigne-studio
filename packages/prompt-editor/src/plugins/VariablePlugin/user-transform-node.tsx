import { $createTextNode, LexicalEditor } from 'lexical';
import { useEffect } from 'react';

import replaceNodes from './utils/replace-nodes';
import { hasBrackets, isBracketStartAndEnd } from './utils/util';
import { $isVariableTextNode, VariableTextNode } from './variable-text-node';

export default function useTransformVariableNode(editor: LexicalEditor) {
  const nodeTransform = (node: VariableTextNode) => {
    const text = node.getTextContent();

    if (hasBrackets(text)) {
      if (!isBracketStartAndEnd(text)) {
        replaceNodes({
          fn: (_nodes) => {
            _nodes.forEach((_node) => {
              if (!$isVariableTextNode(_node)) {
                _node.select();
              }
            });
          },
          node,
          text,
        });
      }
    } else {
      node.replace($createTextNode(text));
    }
  };

  useEffect(() => {
    const handleTransform = editor.registerNodeTransform(VariableTextNode, nodeTransform);
    return () => {
      handleTransform();
    };
  }, [editor]);
}
