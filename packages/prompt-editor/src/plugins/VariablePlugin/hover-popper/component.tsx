import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import { LexicalEditor } from 'lexical';
import { createPortal } from 'react-dom';

export default function PopperVariableNode({
  element,
  editor,
  popperElement,
}: {
  element: HTMLElement;
  editor: LexicalEditor;
  popperElement: (editor: LexicalEditor) => any;
}): JSX.Element | null {
  return createPortal(
    <Popper open anchorEl={element} placement="bottom-start" transition>
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={350}>
          <Paper sx={{ mt: 1 }}>{popperElement(editor)}</Paper>
        </Fade>
      )}
    </Popper>,
    element
  );
}
