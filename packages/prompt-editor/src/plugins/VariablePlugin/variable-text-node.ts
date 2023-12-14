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
  cursor: pointer;
`;

const warningStyle = `
  color: #ef5350;
  font-weight: bold;
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
    return { ...super.exportJSON(), text: this.__text, type: TYPE, version: 1 };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);

    dom.className = 'variable';
    dom.setAttribute('data-custom-node', 'variable');
    dom.setAttribute('data-node-id', String(+new Date()));
    dom.addEventListener('mouseover', this.handleMouseOver.bind(this, dom, this.isVariable));
    dom.addEventListener('mouseleave', this.handleMouseLeave.bind(this, dom));

    if (this.isVariable) {
      dom.style.cssText = style;
    } else {
      dom.style.cssText = warningStyle;
    }

    return dom;
  }

  override updateDOM(prevNode: any, dom: HTMLElement, config: EditorConfig): boolean {
    const update = super.updateDOM(prevNode, dom, config);

    if (this.isVariable) {
      dom.style.cssText = style;
    } else {
      dom.style.cssText = warningStyle;
    }

    dom.addEventListener('mouseover', this.handleMouseOver.bind(this, dom, this.isVariable));
    dom.addEventListener('mouseleave', this.handleMouseLeave.bind(this, dom));

    return update;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute(attr, 'true');
    return { element };
  }

  handleMouseOver(dom: HTMLElement, isVar: boolean) {
    // 外部覆盖
    // eslint-disable-next-line no-console
    console.log(dom, isVar);
  }

  handleMouseLeave() {}

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

  setIsVariable(isVariable: boolean) {
    this.isVariable = isVariable;
  }
}

export function $createVariableNode(text: string, key?: NodeKey): VariableTextNode {
  const node = new VariableTextNode(text, key);
  return $applyNodeReplacement(node);
}

export function $isVariableTextNode(node: LexicalNode | null | undefined): node is VariableTextNode {
  return node instanceof VariableTextNode;
}
