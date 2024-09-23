import LoadingButton from '@app/components/loading/loading-button';
import { getErrorMessage } from '@app/libs/api';
import { createProject } from '@app/libs/project';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import twitterIcon from '@iconify-icons/tabler/brand-twitter';
import contentCopyIcon from '@iconify-icons/tabler/copy';
import linkIcon from '@iconify-icons/tabler/link';
import {
  Box,
  Button,
  ClickAwayListener,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { useSessionContext } from '../../contexts/session';
import { Deployment } from '../../libs/deployment';

export function MakeYoursButton({ deployment }: { deployment: Deployment }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const onMakeYours = async () => {
    try {
      const project = await createProject({ templateId: deployment.projectId, deploymentId: deployment.id });

      currentGitStore.setState({ currentProjectId: project.id });
      navigate(joinURL('/projects', project.id));
    } catch (error) {
      Toast.error(getErrorMessage(error));
    }
  };

  const canMakeYours = useMemo(() => {
    return session.user?.did === deployment.createdBy || ['owner', 'admin'].includes(session.user?.role);
  }, [deployment.createdBy, session.user?.role, session.user?.did]);

  if (deployment.access === 'private') {
    if (!session.user || !canMakeYours) {
      return null;
    }
  }

  return (
    <LoadingButton variant="outlined" onClick={onMakeYours}>
      {t('makeYours')}
    </LoadingButton>
  );
}

export function ShareButton({ deployment }: { deployment: Deployment }) {
  const { t } = useLocaleContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(anchorEl ? null : event.currentTarget);

  const handleClose = () => setAnchorEl(null);

  const shareUrl = joinURL(globalThis.location.origin, window.blocklet.prefix, '/explore/apps', deployment.id);

  const open = Boolean(anchorEl);

  const shareOptions = [
    {
      text: t('deployments.appPage'),
      icon: <Box component={Icon} icon={linkIcon} sx={{ fontSize: 20 }} />,
      handle: () => {
        window.open(shareUrl, '_blank');
        handleClose();
      },
    },
    {
      text: t('duplicate'),
      icon: <Box component={Icon} icon={contentCopyIcon} sx={{ fontSize: 20 }} />,
      handle: () => {
        navigator.clipboard.writeText(shareUrl);
        handleClose();
        Toast.success(t('copied'));
      },
    },
    {
      text: t('shareOnTwitter'),
      icon: <Box component={Icon} icon={twitterIcon} sx={{ fontSize: 20 }} />,
      handle: () => {
        const tweetUrl = withQuery('https://twitter.com/intent/tweet', {
          text: encodeURIComponent(`Just launched my app!\nCheck it out: ${shareUrl}`),
        });

        window.open(tweetUrl, '_blank');
        handleClose();
      },
    },
  ];

  return (
    <>
      <Button variant="outlined" onClick={handleClick}>
        {t('share')}
      </Button>

      <Popper open={open} anchorEl={anchorEl} placement="bottom-start">
        <ClickAwayListener onClickAway={handleClose}>
          <Paper sx={{ mt: 1 }}>
            <List>
              {shareOptions.map((item) => (
                <ListItem key={item.text} dense disablePadding onClick={item.handle}>
                  <ListItemButton>
                    <ListItemIcon sx={{ minWidth: 0, mr: 1 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
