import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import {
  Box,
  CircularProgress,
  ClickAwayListener,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListProps,
  Tooltip as MuiTooltip,
  TooltipProps,
  alpha,
  listItemButtonClasses,
  styled,
  tooltipClasses,
} from '@mui/material';
import { ReactElement, cloneElement, useState } from 'react';

import { Commit } from '../../libs/log';
import Avatar from '../avatar';

export default function CommitsTip({
  loading,
  commits,
  hash,
  children,
  onCommitSelect,
}: {
  loading?: boolean;
  commits?: Commit[];
  hash?: string;
  children: ReactElement<any>;
  onCommitSelect: (commit: Commit) => any;
}) {
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
          PopperProps={{
            disablePortal: true,
          }}
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
          title={
            <CommitListView
              loading={loading}
              selected={hash}
              commits={commits}
              onClick={async (commit) => {
                await onCommitSelect(commit);
                handleTooltipClose();
              }}
            />
          }>
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

export function CommitListView({
  commits,
  loading,
  selected,
  onClick,
  listProps,
}: {
  commits?: Commit[];
  loading?: boolean;
  selected?: string;
  onClick?: (commit: Commit) => any;
  listProps?: ListProps;
}) {
  const { t, locale } = useLocaleContext();
  const [loadingItemHash, setLoadingItemHash] = useState<string>();

  return (
    <List disablePadding dense {...(listProps || {})}>
      {commits?.map((item) => (
        <ListItem disablePadding key={item.oid} className="commit-item">
          <ListItemButton
            selected={selected === item.oid}
            onClick={async () => {
              try {
                setLoadingItemHash(item.oid);
                await onClick?.(item);
              } finally {
                setLoadingItemHash(undefined);
              }
            }}>
            <ListItemIcon>
              <Box component={Avatar} src={item.commit.author.avatar} did={item.commit.author.did} variant="circle" />
            </ListItemIcon>
            <ListItemText
              primary={item.commit.message}
              // @ts-ignore
              secondary={<RelativeTime locale={locale} value={item.commit.author.timestamp * 1000} />}
              slotProps={{
                primary: { noWrap: true },
                secondary: { noWrap: true },
              }}
            />
            <Box
              sx={{
                width: 20,
                ml: 1,
                display: 'flex',
                alignItems: 'center',
              }}>
              {loadingItemHash === item.oid && <CircularProgress size={16} />}
            </Box>
          </ListItemButton>
        </ListItem>
      ))}
      {loading ? (
        <ListItem sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={20} />
        </ListItem>
      ) : (
        !commits?.length && (
          <ListItem>
            <ListItemText
              primary={t('alert.noCommits')}
              slotProps={{
                primary: { textAlign: 'center' },
              }}
            />
          </ListItem>
        )
      )}
    </List>
  );
}
