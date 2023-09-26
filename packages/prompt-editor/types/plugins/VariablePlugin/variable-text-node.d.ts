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
type Type = 'variable';
export declare const TYPE = 'variable';
export interface VariableInfo {
  type: string;
  text: string;
}
export type SerializedVariableNode = Spread<
  {
    type: Type;
    text: string;
  },
  SerializedTextNode
>;
export declare class VariableTextNode extends TextNode {
  static getType(): string;
  static clone(node: VariableTextNode): VariableTextNode;
  static importJSON(serializedNode: SerializedVariableNode): VariableTextNode;
  exportJSON(): SerializedVariableNode;
  createDOM(config: EditorConfig): HTMLElement;
  exportDOM(): DOMExportOutput;
  static importDOM(): DOMConversionMap | null;
  isTextEntity(): true;
}
export declare function $createVariableNode(text: string, key?: NodeKey): VariableTextNode;
export declare function $isVariableTextNode(node: LexicalNode | null | undefined): node is VariableTextNode;
export {};
