import {
  Box,
  ClickAwayListener,
  Tooltip as MuiTooltip,
  TooltipProps,
  alpha,
  listItemButtonClasses,
  listItemTextClasses,
  styled,
  tooltipClasses,
} from '@mui/material';
import { ReactElement, ReactNode, cloneElement, useState } from 'react';

export default function Dropdown({ children, dropdown }: { children: ReactElement; dropdown: ReactNode }) {
  const [open, setOpen] = useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  return (
    <ClickAwayListener onClickAway={handleTooltipClose}>
      <div>
        <Tooltip
          PopperProps={{ disablePortal: true }}
          onClose={handleTooltipClose}
          open={open}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          sx={{
            [`.${tooltipClasses.tooltip}`]: {
              minWidth: 200,
              maxHeight: '60vh',
              overflow: 'auto',
            },
          }}
          title={<Box onClick={handleTooltipClose}>{dropdown}</Box>}>
          {cloneElement(children, { onClick: handleTooltipOpen })}
        </Tooltip>
      </div>
    </ClickAwayListener>
  );
}

const Tooltip = styled(({ className, ...props }: TooltipProps) => (
  <MuiTooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[1],
    borderRadius: 6,
    padding: 4,
  },

  [`.${listItemButtonClasses.root}`]: {
    borderRadius: 6,

    [`.${listItemTextClasses.primary}`]: {
      fontSize: 16,
    },

    '&.active': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    },
  },
}));
