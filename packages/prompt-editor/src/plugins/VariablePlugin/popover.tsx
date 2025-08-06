import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Fade } from '@mui/material';
import Popper from '@mui/material/Popper';
import { LexicalEditor } from 'lexical';
import { useEffect, useRef, useState } from 'react';

import { extractBracketContent } from './utils/util';
import { VariableTextNode } from './variable-text-node';

export default function VariablePopover({
  popperElement = undefined,
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
  const [state, setState] = useState<null | { popper: boolean; anchorEl: null | HTMLElement }>({
    popper: false,
    anchorEl: null,
  });
  const ref = useRef<null | boolean>(null);

  useEffect(() => {
    if (!popperElement) return;

    VariableTextNode.prototype.handleMouseOver = (dom) => {
      ref.current = true;

      setTimeout(() => {
        if (ref.current) {
          setState({ popper: true, anchorEl: dom });
        }
      }, 500);
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

  useEffect(() => {
    const fn = () => {
      ref.current = false;
      setState(null);
    };
    window.addEventListener('keydown', fn);

    return () => {
      window.removeEventListener('keydown', fn);
    };
  }, []);

  const handleClose = () => setState(null);

  if (!popperElement) {
    return null;
  }

  if (!state?.anchorEl) {
    return null;
  }

  const text = extractBracketContent(state?.anchorEl.innerText) || '';
  return (
    <Popper
      transition
      placement="top"
      open={state.popper}
      anchorEl={state.anchorEl}
      sx={{ zIndex: (theme) => theme.zIndex.tooltip }}
      modifiers={[{ name: 'offset', enabled: true, options: { offset: [0, 4] } }]}>
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} onMouseLeave={handleClose} onMouseOver={() => (ref.current = true)}>
          {popperElement({ editor, text, handleClose })}
        </Fade>
      )}
    </Popper>
  );
}
