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

type Type = 'comment';
export const TYPE = 'comment';
const attr = `data-lexical-${TYPE}`;

export interface CommentInfo {
  type: string;
  text: string;
}

export type SerializedCommentNode = Spread<{ type: Type; text: string }, SerializedTextNode>;

function convertCommentElement(domNode: HTMLElement): DOMConversionOutput | null {
  const { textContent } = domNode;

  if (textContent !== null) {
    const node = $createCommentNode(textContent);
    return { node };
  }

  return null;
}

const style = 'color: slategray';

export class CommentNode extends TextNode {
  static override getType(): string {
    return TYPE;
  }

  static override clone(node: CommentNode): CommentNode {
    return new CommentNode(node.__text, node.__key);
  }

  static override importJSON(serializedNode: SerializedCommentNode): CommentNode {
    const node = $createCommentNode(serializedNode.text);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  override exportJSON(): SerializedCommentNode {
    return {
      ...super.exportJSON(),
      text: this.__text,
      type: TYPE,
      version: 1,
    };
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cssText = style;
    dom.className = 'comment-dom';
    dom.setAttribute('data-node-id', String(+new Date()));

    return dom;
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
          conversion: convertCommentElement,
          priority: 1,
        };
      },
    };
  }

  override isTextEntity(): true {
    return true;
  }
}

export function $createCommentNode(text: string, key?: NodeKey): CommentNode {
  const node = new CommentNode(text, key);
  return $applyNodeReplacement(node);
}

export function $isCommentNode(node: LexicalNode | null | undefined): node is CommentNode {
  return node instanceof CommentNode;
}
