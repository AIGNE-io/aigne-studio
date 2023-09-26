import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import { createPortal } from 'react-dom';

export default function PopperVariableNode({ element }: { element: HTMLElement }): JSX.Element | null {
  return createPortal(
    <Popper open anchorEl={element} placement="bottom-start" transition>
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={350}>
          <Paper sx={{ mt: 1 }}>
            <Typography sx={{ p: 2 }}>The content of the Popper.</Typography>
          </Paper>
        </Fade>
      )}
    </Popper>,
    element
  );
}
