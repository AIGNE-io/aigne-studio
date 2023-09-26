import { LexicalNode } from 'lexical';
declare function replaceNodes({
  text,
  node,
  fn,
}: {
  text: string;
  node: LexicalNode;
  fn?: (_nodes: LexicalNode[]) => void;
}): void;
export default replaceNodes;
