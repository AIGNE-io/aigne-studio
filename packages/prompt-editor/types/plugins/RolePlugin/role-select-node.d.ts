/// <reference types="react" />
import { DecoratorNode, LexicalEditor, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from 'lexical';
type Type = 'role';
export interface RoleSelectInfo {
  type: string;
  text: string;
}
export type SerializedRoleNode = Spread<
  {
    type: Type;
    text: string;
  },
  SerializedLexicalNode
>;
export declare class RoleSelectNode extends DecoratorNode<JSX.Element | null> {
  __text: string;
  static clone(node: RoleSelectNode): RoleSelectNode;
  static getType(): string;
  static importJSON(serializedNode: SerializedRoleNode): RoleSelectNode;
  exportJSON(): SerializedRoleNode;
  constructor(text: string, key?: NodeKey);
  updateDOM(): boolean;
  createDOM(): HTMLElement;
  getText(): string;
  setText(text: string): void;
  decorate(editor: LexicalEditor): JSX.Element;
  isIsolated(): true;
}
export declare function $createRoleSelectNode(data: string): RoleSelectNode;
export declare function $isRoleSelectNode(
  node: RoleSelectNode | LexicalNode | null | undefined
): node is RoleSelectNode;
export {};
