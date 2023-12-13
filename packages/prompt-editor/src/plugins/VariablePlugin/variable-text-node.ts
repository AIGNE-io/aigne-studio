import {
  $applyNodeReplacement,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
  Spread,
  TextNode,
} from 'lexical';

type Type = 'variable';
export const TYPE = 'variable';
const attr = `data-lexical-${TYPE}`;

export interface VariableInfo {
  type: string;
  text: string;
}

export type SerializedVariableNode = Spread<{ type: Type; text: string }, SerializedTextNode>;

function convertVariableElement(domNode: HTMLElement): DOMConversionOutput | null {
  const { textContent } = domNode;

  if (textContent !== null) {
    const node = $createVariableNode(textContent);
    return { node };
  }

  return null;
}

const style = `
  color: rgb(234 179 8/1);
  font-weight: bold;
  z-index:2
`;

const warningStyle = `
  color: red;
  font-weight: bold;
  z-index:2;
  cursor: pointer;
`;

export class VariableTextNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.isVariable = true;
  }

  static override getType(): string {
    return TYPE;
  }

  static override clone(node: VariableTextNode): VariableTextNode {
    return new VariableTextNode(node.__text, node.__key);
  }

  static override importJSON(serializedNode: SerializedVariableNode): VariableTextNode {
    const node = $createVariableNode(serializedNode.text);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  override exportJSON(): SerializedVariableNode {
    return {
      ...super.exportJSON(),
      text: this.__text,
      type: TYPE,
      version: 1,
    };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = 'variable';
    dom.setAttribute('data-custom-node', 'variable');
    dom.setAttribute('data-node-id', String(+new Date()));

    if (this.isVariable) {
      dom.style.cssText = style;
    } else {
      dom.style.cssText = warningStyle;
    }

    return dom;
  }

  override updateDOM(prevNode: any, dom: HTMLElement, config: EditorConfig): boolean {
    const update = super.updateDOM(prevNode, dom, config);

    dom.className = 'variable';
    dom.setAttribute('data-custom-node', 'variable');
    dom.setAttribute('data-node-id', String(+new Date()));

    if (this.isVariable) {
      dom.style.cssText = style;
    } else {
      dom.style.cssText = warningStyle;
    }

    return update;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute(attr, 'true');
    return { element };
  }

  static override importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute(attr)) {
          return null;
        }

        return {
          conversion: convertVariableElement,
          priority: 1,
        };
      },
    };
  }

  override isTextEntity(): true {
    return true;
  }

  setSpecial(b: boolean) {
    this.isVariable = b;
    console.log(2);
  }
}

export function $createVariableNode(text: string, key?: NodeKey): VariableTextNode {
  const node = new VariableTextNode(text, key);
  return $applyNodeReplacement(node);
}

export function $isVariableTextNode(node: LexicalNode | null | undefined): node is VariableTextNode {
  return node instanceof VariableTextNode;
}
