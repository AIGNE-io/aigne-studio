import {
  $setSelection,
  DecoratorNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import RoleSelect from './component';

type Type = 'role';
const TYPE: Type = 'role';

export interface RoleSelectInfo {
  type: string;
  text: string;
}

export type SerializedRoleNode = Spread<{ type: Type; text: string }, SerializedLexicalNode>;

export class RoleSelectNode extends DecoratorNode<JSX.Element | null> {
  __text: string;

  static override clone(node: RoleSelectNode): RoleSelectNode {
    return new RoleSelectNode(node.__text, node.__key);
  }

  static override getType(): string {
    return TYPE;
  }

  static override importJSON(serializedNode: SerializedRoleNode): RoleSelectNode {
    const node = $createRoleSelectNode(serializedNode.text);
    return node;
  }

  override exportJSON(): SerializedRoleNode {
    return {
      text: this.__text,
      type: TYPE,
      version: 1,
    };
  }

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
  }

  override updateDOM(): boolean {
    return false;
  }

  override createDOM(): HTMLElement {
    return document.createElement('span');
  }

  getText(): string {
    return this.__text;
  }

  setText(text: string): void {
    const writable = this.getWritable();
    writable.__text = text;
  }

  override decorate(editor: LexicalEditor): JSX.Element {
    const handleOnChange = (text: string, selection?: RangeSelection) => {
      editor.update(() => {
        this.setText(text);
        if (selection) {
          $setSelection(selection);
        }
      });
    };

    return <RoleSelect text={this.__text} onChange={handleOnChange} />;
  }

  override isIsolated(): true {
    return true;
  }

  override isSelected() {
    return false;
  }
}

export function $createRoleSelectNode(data: string): RoleSelectNode {
  return new RoleSelectNode(data);
}

export function $isRoleSelectNode(node: RoleSelectNode | LexicalNode | null | undefined): node is RoleSelectNode {
  return node instanceof RoleSelectNode;
}
