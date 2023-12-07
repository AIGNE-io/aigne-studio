import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $insertNodes, COMMAND_PRIORITY_EDITOR, LexicalCommand, LexicalEditor, createCommand } from 'lexical';
import { useEffect } from 'react';

// import { $isCommentNode } from '../CommentPlugin/comment-node';
import PopperVariableNode from './hover-popper/component';
import useHoverPopper from './hover-popper/use-hover-popper';
import useTransformVariableNode from './user-transform-node';
import { $createVariableNode, VariableTextNode } from './variable-text-node';

export const INSERT_VARIABLE_COMMAND: LexicalCommand<{ name: string }> = createCommand('INSERT_VARIABLE_COMMAND');

export default function VarContextPlugin({
  popperElement,
}: {
  popperElement?: (editor: LexicalEditor) => any;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [
    element,
    { runClick: throttleClick, runHover: throttleHover, runKeyDown: throttleKeyDown, runKeyUp: throttleKeyUp },
  ] = useHoverPopper(editor);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<{ name: string }>(
        INSERT_VARIABLE_COMMAND,
        (payload) => {
          const node = $createVariableNode(`{{ ${payload.name} }}`);
          $insertNodes([node]);

          if (!payload?.name?.trim()) {
            node.select(3, 3);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR
      )
    );
  }, [editor]);

  useEffect(() => {
    if (!editor.hasNodes([VariableTextNode])) {
      throw new Error('VarContextPlugin: VariableTextNode not registered on editor');
    }
    return mergeRegister(
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

  if (element && popperElement && typeof popperElement === 'function') {
    return <PopperVariableNode element={element} editor={editor} popperElement={popperElement} />;
  }

  return null;
}
