import {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
  TextNode,
} from 'lexical';
type Type = 'comment';
export declare const TYPE = 'comment';
export interface CommentInfo {
  type: string;
  text: string;
}
export type SerializedCommentNode = Spread<
  {
    type: Type;
    text: string;
  },
  SerializedTextNode
>;
export declare class CommentNode extends TextNode {
  static getType(): string;
  static clone(node: CommentNode): CommentNode;
  static importJSON(serializedNode: SerializedCommentNode): CommentNode;
  exportJSON(): SerializedCommentNode;
  createDOM(config: EditorConfig): HTMLElement;
  exportDOM(): DOMExportOutput;
  static importDOM(): DOMConversionMap | null;
  isTextEntity(): true;
}
export declare function $createCommentNode(text: string, key?: NodeKey): CommentNode;
export declare function $isCommentNode(node: LexicalNode | null | undefined): node is CommentNode;
export {};
