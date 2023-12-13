import { $createTextNode, LexicalEditor, TextNode } from 'lexical';
import { useEffect } from 'react';

import replaceNodes from './utils/replace-nodes';
import { extractBracketContent, hasBrackets, isBracketStartAndEnd } from './utils/util';
import { $isVariableTextNode, VariableTextNode } from './variable-text-node';

export default function useTransformVariableNode(editor: LexicalEditor, variables: string[] = []) {
  const nodeTextTransform = (node: TextNode) => {
    const text = node.getTextContent();

    if (hasBrackets(text)) {
      if (!isBracketStartAndEnd(text)) {
        replaceNodes({
          fn: (_nodes) => {
            _nodes.forEach((_node) => {
              if ($isVariableTextNode(_node)) {
                _node.select();
              }
            });
          },
          node,
          text,
        });
      }
    }
  };

  const nodeVariableTransform = (node: VariableTextNode) => {
    const text = node.getTextContent();

    if (variables && variables.length) {
      node.setIsVariable(variables.includes(extractBracketContent(text) || ''));
    }

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
    const handleTransform = editor.registerNodeTransform(VariableTextNode, nodeVariableTransform);
    return () => {
      handleTransform();
    };
  }, [editor, variables]);

  useEffect(() => {
    const handleTransform = editor.registerNodeTransform(TextNode, nodeTextTransform);
    return () => {
      handleTransform();
    };
  }, [editor]);

  return null;
}
