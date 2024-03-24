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

export const variableStyle = `
  color: rgb(234 179 8/1);
  font-weight: bold;
  cursor: pointer;
`;

export const textStyle = `
  color: #ef5350;
  font-weight: bold;
  cursor: pointer;
`;

export class VariableTextNode extends TextNode {
  public isVariable: boolean;

  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.isVariable = false;
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
    return { ...super.exportJSON(), text: this.__text, type: TYPE, version: 1 };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);

    dom.className = 'variable';
    dom.setAttribute('data-lexical-key', this.getKey());
    dom.setAttribute('data-lexical-variable', this.getKey());
    dom.addEventListener('mouseover', this.handleMouseOver.bind(this, dom, this.isVariable));
    dom.addEventListener('mouseleave', this.handleMouseLeave.bind(this, dom));

    return dom;
  }

  override updateDOM(prevNode: any, dom: HTMLElement, config: EditorConfig): boolean {
    const update = super.updateDOM(prevNode, dom, config);
    return update;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute(attr, 'true');
    return { element };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleMouseOver(_dom: HTMLElement, _isVar: boolean) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleMouseLeave(_dom: HTMLElement) {}

  static override importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute(attr)) {
          return null;
        }

        return { conversion: convertVariableElement, priority: 1 };
      },
    };
  }

  override isTextEntity(): true {
    return true;
  }
}

export function $createVariableNode(text: string, key?: NodeKey): VariableTextNode {
  const node = new VariableTextNode(text, key);
  return $applyNodeReplacement(node);
}

export function $isVariableTextNode(node: LexicalNode | null | undefined): node is VariableTextNode {
  return node instanceof VariableTextNode;
}
