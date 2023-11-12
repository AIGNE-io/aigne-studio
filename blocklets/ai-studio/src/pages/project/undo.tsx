import { Box, IconButton } from '@mui/material';

import Redo from './icons/redo';
import Undo from './icons/undo';
import { useUndoManager } from './state';

export default function UndoAndRedo({ projectId, gitRef, id }: { gitRef: string; id: string; projectId: string }) {
  const undoManager = useUndoManager(projectId, gitRef, id);

  return (
    <Box>
      <IconButton disabled={!undoManager.canUndo} onClick={undoManager.undo}>
        <Undo />
      </IconButton>

      <IconButton disabled={!undoManager.canRedo} onClick={undoManager.redo}>
        <Redo />
      </IconButton>
    </Box>
  );
}
