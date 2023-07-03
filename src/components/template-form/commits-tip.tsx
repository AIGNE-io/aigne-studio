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
  Tooltip as MuiTooltip,
  TooltipProps,
  alpha,
  listItemButtonClasses,
  listItemTextClasses,
  styled,
  tooltipClasses,
} from '@mui/material';
import { ReactElement, cloneElement, useState } from 'react';
import { useAsync } from 'react-use';

import { Commit, getCommits, getTemplateCommits } from '../../libs/templates';
import Avatar from '../avatar';

export default function CommitsTip({
  templateId,
  hash,
  children,
  onCommitSelect: onCommitClick,
}: {
  templateId?: string;
  hash?: string;
  children: ReactElement;
  onCommitSelect: (commit: Commit) => any;
}) {
  const { t, locale } = useLocaleContext();

  const [open, setOpen] = useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  const { value, loading, error } = useAsync(
    () => (templateId ? getTemplateCommits(templateId) : getCommits()),
    [templateId]
  );
  if (error) console.error(error);

  const [loadingItemHash, setLoadingItemHash] = useState<string>();

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
            <List disablePadding dense>
              {value?.commits.map((item) => (
                <ListItem disablePadding key={item.oid}>
                  <ListItemButton
                    selected={hash === item.oid}
                    onClick={async () => {
                      try {
                        setLoadingItemHash(item.oid);
                        await onCommitClick(item);
                        handleTooltipClose();
                      } finally {
                        setLoadingItemHash(undefined);
                      }
                    }}>
                    <ListItemIcon>
                      <Box
                        component={Avatar}
                        src={item.commit.author.avatar}
                        did={item.commit.author.did}
                        variant="circle"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.commit.message}
                      secondary={<RelativeTime locale={locale} value={item.commit.author.timestamp * 1000} />}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                    <Box width={20} ml={1} display="flex" alignItems="center">
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
                !value?.commits.length && (
                  <ListItem>
                    <ListItemText primary={t('alert.noCommits')} primaryTypographyProps={{ textAlign: 'center' }} />
                  </ListItem>
                )
              )}
            </List>
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

    [`.${listItemTextClasses.primary}`]: {
      fontSize: 16,
    },

    '&.active': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    },
  },
}));
