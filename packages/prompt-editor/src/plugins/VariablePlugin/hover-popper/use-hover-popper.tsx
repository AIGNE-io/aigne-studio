import useThrottleFn from 'ahooks/lib/useThrottleFn';
import { LexicalEditor } from 'lexical';
import { useState } from 'react';

type TypeAPI = {
  runClick: (e: MouseEvent) => void;
  runHover: (e: MouseEvent) => void;
  runKeyDown: (e: KeyboardEvent) => void;
  runKeyUp: (e: KeyboardEvent) => void;
};

const useHoverPopper = (editor: LexicalEditor): [null | HTMLElement, TypeAPI] => {
  let lastHoverElement: HTMLElement | undefined;
  let timer: NodeJS.Timeout | undefined;
  const [element, setElement] = useState<null | HTMLElement>(null);
  let tracking = false;

  const onHover = (e: MouseEvent) => {
    const editable = editor.isEditable();
    if (!editable) return;

    if (tracking) {
      e.preventDefault();
      return;
    }

    const domNode = e.target as HTMLElement;
    lastHoverElement = domNode;

    if (domNode.nodeName === 'SPAN' && domNode.getAttribute('data-custom-node') === 'variable') {
      if (lastHoverElement && domNode) {
        // 定时内，不重复操作
        if (timer) return;
        if (element) return;

        timer = setTimeout(() => {
          clearTimeout(timer);
          timer = undefined;
          setElement(domNode);
        }, 500);
      }
    } else {
      setElement(null);
    }
  };

  const onKeyDown = () => {
    tracking = true;
    const editable = editor.isEditable();
    if (!editable) return;

    clearTimeout(timer);
    timer = undefined;
    setElement(null);
  };

  const runClick = () => {
    const editable = editor.isEditable();
    if (!editable) return;

    clearTimeout(timer);
    timer = undefined;
    setElement(null);
  };

  const onKeyup = () => {
    tracking = false;
  };

  const { run: runHover } = useThrottleFn(onHover, { wait: 500 });
  const { run: runKeyDown } = useThrottleFn(onKeyDown, { wait: 0 });
  const { run: runKeyUp } = useThrottleFn(onKeyup, { wait: 0 });

  // @ts-ignore
  return [element, { runClick, runHover, runKeyDown, runKeyUp }];
};

export default useHoverPopper;
