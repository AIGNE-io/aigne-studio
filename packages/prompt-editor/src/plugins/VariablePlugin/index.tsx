import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_CRITICAL, KEY_DOWN_COMMAND } from 'lexical';
import { useEffect } from 'react';

import PopperVariableNode from './hover-popper/component';
import useHoverPopper from './hover-popper/use-hover-popper';
import useTransformVariableNode from './user-transform-node';
import { $createVariableNode, $isVariableTextNode, VariableTextNode } from './variable-text-node';

export default function VarContextPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [
    element,
    { runClick: throttleClick, runHover: throttleHover, runKeyDown: throttleKeyDown, runKeyUp: throttleKeyUp },
  ] = useHoverPopper(editor);

  useEffect(() => {
    if (!editor.hasNodes([VariableTextNode])) {
      throw new Error('VarContextPlugin: VariableTextNode not registered on editor');
    }
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          const selection = $getSelection();
          // 识别 BracketLeft Code "{",进行唤起
          const on = true;

          if (event.shiftKey && event.keyCode === 219 && on) {
            if ($isRangeSelection(selection)) {
              try {
                const anchorNode = selection.anchor.getNode();
                if ($isVariableTextNode(anchorNode)) {
                  return true;
                }

                if ($isTextNode(anchorNode)) {
                  event.preventDefault();

                  const node = $createVariableNode('{{  }}');
                  selection.insertNodes([node], true);
                  node.select(3, 3);
                }

                return true;
              } catch (error) {
                console.error(error);
                return false;
              }
            }
          }

          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      editor.registerRootListener((rootElement: null | HTMLElement, prevRootElement: null | HTMLElement) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('mouseover', throttleHover);
          prevRootElement.removeEventListener('keydown', throttleKeyDown);
          prevRootElement.removeEventListener('keyup', throttleKeyUp);
          prevRootElement.removeEventListener('click', throttleClick);
        }

        if (rootElement !== null) {
          rootElement.addEventListener('mouseover', throttleHover);
          rootElement.addEventListener('keydown', throttleKeyDown);
          rootElement.addEventListener('keyup', throttleKeyUp);
          rootElement.addEventListener('click', throttleClick);
        }
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useTransformVariableNode(editor);

  if (element) {
    return <PopperVariableNode element={element} />;
  }

  return null;
}
