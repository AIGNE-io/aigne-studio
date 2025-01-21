import type { TooltipProps } from '@mui/material';
import {
  Box,
  ClickAwayListener,
  Tooltip as MuiTooltip,
  alpha,
  listItemButtonClasses,
  styled,
  tooltipClasses,
} from '@mui/material';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, useState } from 'react';

export default function Dropdown({
  children,
  dropdown,
  ...props
}: {
  children: ReactElement;
  dropdown: ReactNode;
} & Pick<TooltipProps, 'PopperProps' | 'placement' | 'sx'>) {
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
          {...props}
          onClose={handleTooltipClose}
          open={open}
          disableFocusListener
          disableHoverListener
          disableTouchListener
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

    '&.active': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    },
  },
}));
