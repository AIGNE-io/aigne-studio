import { $createTextNode, LexicalNode, TextNode } from 'lexical';

import { $createVariableNode } from '../variable-text-node';
import { isBracketStartAndEnd, splitText } from './util';

function replaceNodes({
  text,
  node,
  fn = () => {},
}: {
  text: string;
  node: LexicalNode;
  fn?: (_nodes: TextNode[]) => void;
}) {
  const list = splitText(text);

  if (list && list.length) {
    const nodes = list.filter(Boolean).map((item) => {
      const isBracket = isBracketStartAndEnd(item);

      if (isBracket) {
        return $createVariableNode(item.trim());
      }

      return $createTextNode(item);
    });

    for (let j = 0; j < nodes.length; j++) {
      const Node = nodes[j];
      if (Node) {
        if (j === 0) {
          node.replace(Node);
        } else {
          (nodes[j - 1] as TextNode).insertAfter(Node);
        }
      }
    }

    if (fn && typeof fn === 'function') {
      fn(nodes);
    }
  }
}

export default replaceNodes;
