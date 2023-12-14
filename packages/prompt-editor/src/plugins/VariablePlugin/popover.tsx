import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Fade } from '@mui/material';
import Box from '@mui/material/Box';
import Popper from '@mui/material/Popper';
import { LexicalEditor } from 'lexical';
import { useEffect, useRef, useState } from 'react';

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
  const ref = useRef<null | boolean>(null);

  useEffect(() => {
    if (!popperElement) return;

    VariableTextNode.prototype.handleMouseOver = (dom, isVariable) => {
      ref.current = true;
      setState({ popper: true, anchorEl: dom, isVariable });
    };

    VariableTextNode.prototype.handleMouseLeave = () => {
      ref.current = false;
      setTimeout(() => {
        if (!ref.current) {
          setState(null);
        }
      }, 1000);
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
  return (
    <Box onMouseLeave={handleClose} onMouseOver={() => (ref.current = true)}>
      <Popper
        open
        transition
        placement="top"
        anchorEl={state.anchorEl}
        sx={{ zIndex: (theme) => theme.zIndex.tooltip }}
        modifiers={[{ name: 'offset', enabled: true, options: { offset: [0, 4] } }]}>
        {({ TransitionProps }) => <Fade {...TransitionProps}>{popperElement({ editor, text, handleClose })}</Fade>}
      </Popper>
    </Box>
  );
}
