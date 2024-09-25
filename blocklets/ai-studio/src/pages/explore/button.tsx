import LoadingButton from '@app/components/loading/loading-button';
import { getErrorMessage } from '@app/libs/api';
import { createProject } from '@app/libs/project';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import twitterIcon from '@iconify-icons/tabler/brand-twitter';
import externalLinkIcon from '@iconify-icons/tabler/external-link';
import linkIcon from '@iconify-icons/tabler/link';
import { LoadingButtonProps } from '@mui/lab';
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
import { joinURL } from 'ufo';

import { useSessionContext } from '../../contexts/session';
import { Deployment } from '../../libs/deployment';
import { useProjectStore } from '../project/yjs-state';

function generateTwitterShareUrl(data: {
  title: string;
  description: string;
  url: string;
  hashtags?: string[];
  via?: string;
  related?: string[];
}) {
  const { title, description, url, hashtags = [], via, related = [] } = data;

  const params = new URLSearchParams();

  const tweetText = `${title}\n${description}`;
  params.append('text', tweetText);

  params.append('url', url);

  if (hashtags.length > 0) {
    params.append('hashtags', hashtags.join(','));
  }

  if (via) {
    params.append('via', via);
  }

  if (related.length > 0) {
    params.append('related', related.join(','));
  }

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function MakeYoursButton({ deployment, ...props }: { deployment: Deployment } & LoadingButtonProps) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const onMakeYours = async () => {
    if (!session.user) {
      await new Promise<void>((resolve) => {
        session.login(() => resolve());
      });
    }

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
    <LoadingButton variant="outlined" onClick={onMakeYours} {...props}>
      {t('makeYours')}
    </LoadingButton>
  );
}

export function ShareButton({ deployment }: { deployment: Deployment }) {
  const { t } = useLocaleContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { projectSetting } = useProjectStore(deployment.projectId, deployment.projectRef);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(anchorEl ? null : event.currentTarget);

  const handleClose = () => setAnchorEl(null);

  const shareUrl = joinURL(globalThis.location.origin, window.blocklet.prefix, '/apps', deployment.id);

  const open = Boolean(anchorEl);

  const shareOptions = [
    {
      text: t('openInNewTab'),
      icon: <Box component={Icon} icon={externalLinkIcon} sx={{ fontSize: 20 }} />,
      handle: () => {
        window.open(shareUrl, '_blank');
        handleClose();
      },
    },
    {
      text: t('copyLink'),
      icon: <Box component={Icon} icon={linkIcon} sx={{ fontSize: 20 }} />,
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
        window.open(
          generateTwitterShareUrl({
            title: projectSetting.name || '',
            description: projectSetting.description || '',
            url: shareUrl,
            hashtags: ['Arcblock', 'AIGNE', 'AI'],
            via: 'Arcblock',
          }),
          '_blank'
        );
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
