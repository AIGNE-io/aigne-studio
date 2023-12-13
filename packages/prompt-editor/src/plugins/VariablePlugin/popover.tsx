import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Fade } from '@mui/material';
import Box from '@mui/material/Box';
import Popper from '@mui/material/Popper';
import { LexicalEditor } from 'lexical';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { extractBracketContent } from './utils/util';
import { VariableTextNode } from './variable-text-node';

export default function VariablePopover({
  popperElement,
}: {
  popperElement?: ({
    text,
    editor,
    handleClose,
  }: {
    text: string;
    editor: LexicalEditor;
    handleClose: () => any;
  }) => any;
}) {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<null | { popper: boolean; anchorEl: null | HTMLElement; isVariable: boolean }>({
    popper: false,
    anchorEl: null,
    isVariable: false,
  });

  useEffect(() => {
    if (!popperElement) return;

    VariableTextNode.prototype.handleMouseOver = (dom, isVariable) => {
      setState({ popper: true, anchorEl: dom, isVariable });
    };
  }, [editor]);

  const handleClose = () => setState(null);

  if (!popperElement) {
    return null;
  }

  if (!state?.anchorEl) {
    return null;
  }

  const text = extractBracketContent(state?.anchorEl.innerText) || '';

  return createPortal(
    <Popper open anchorEl={state.anchorEl} transition placement="top">
      {({ TransitionProps }) => (
        <Fade {...TransitionProps}>
          <Box onMouseLeave={handleClose}>{popperElement({ editor, text, handleClose })}</Box>
        </Fade>
      )}
    </Popper>,
    state.anchorEl
  );
}
