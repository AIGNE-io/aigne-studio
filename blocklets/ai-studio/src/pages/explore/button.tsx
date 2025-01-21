import LoadingButton from '@app/components/loading/loading-button';
import { showPlanUpgrade } from '@app/components/multi-tenant-restriction';
import { getErrorMessage } from '@app/libs/api';
import { createProject } from '@app/libs/project';
import { checkErrorType } from '@app/libs/util';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import type { ProjectSettings } from '@blocklet/ai-runtime/types';
import { RuntimeErrorType } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ArrowsShuffleIcon from '@iconify-icons/tabler/arrows-shuffle';
import twitterIcon from '@iconify-icons/tabler/brand-twitter';
import linkIcon from '@iconify-icons/tabler/link';
import Share2Icon from '@iconify-icons/tabler/share-2';
import type { LoadingButtonProps } from '@mui/lab';
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
  Tooltip,
} from '@mui/material';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { useProjectLimiting } from '../../contexts/projects';
import { useSessionContext } from '../../contexts/session';
import type { Deployment } from '../../libs/deployment';
import ImportFromFork from '../project/projects-page/import-from-fork';

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

export function MakeYoursButton({
  project,
  deployment,
  ...props
}: { project: ProjectSettings; deployment: Deployment } & LoadingButtonProps) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const [dialog, setDialog] = useState<ReactElement | null>(null);
  const { checkProjectLimitAsync } = useProjectLimiting();

  const onDialogClose = () => {
    setDialog(null);
  };

  const onClick = async () => {
    if (!session.user) {
      await new Promise<void>((resolve) => {
        session.login(() => resolve());
      });
    }
    if (await checkProjectLimitAsync()) {
      setDialog(<ImportFromFork project={project} onCreate={onMakeYours} onClose={onDialogClose} />);
    }
  };

  const onMakeYours = async ({ name, description }: { name: string; description: string }) => {
    try {
      onDialogClose();
      const forkedProject = await createProject({
        name,
        description,
        templateId: deployment.projectId,
        deploymentId: deployment.id,
      });
      currentGitStore.setState({ currentProjectId: forkedProject.id });
      navigate(joinURL('/projects', forkedProject.id));
    } catch (error) {
      if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
        showPlanUpgrade('projectLimit');
      } else {
        Toast.error(getErrorMessage(error));
      }
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
    <>
      <Tooltip title={t('makeYoursTip')}>
        <LoadingButton
          onClick={onClick}
          color="primary"
          variant="contained"
          startIcon={<Box component={Icon} icon={ArrowsShuffleIcon} sx={{ fontSize: 14 }} />}
          {...props}>
          {t('makeYours')}
        </LoadingButton>
      </Tooltip>
      {dialog}
    </>
  );
}

export function useShareUrl({ deployment }: { deployment: Deployment }) {
  const { session } = useSessionContext();
  const shareUrl = withQuery(joinURL(globalThis.location.origin, window.blocklet.prefix, '/apps', deployment.id), {
    inviter: session.user?.did,
  });
  return { shareUrl };
}

export function ShareButton({ deployment, project }: { deployment: Deployment; project: ProjectSettings }) {
  const { t } = useLocaleContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(anchorEl ? null : event.currentTarget);

  const handleClose = () => setAnchorEl(null);

  const { shareUrl } = useShareUrl({ deployment });

  const open = Boolean(anchorEl);

  const shareOptions = [
    {
      testid: 'copy-link',
      text: t('copyLink'),
      icon: <Box component={Icon} icon={linkIcon} sx={{ fontSize: 20 }} />,
      handle: () => {
        navigator.clipboard.writeText(shareUrl);
        handleClose();
        Toast.success(t('copied'));
      },
    },
    {
      testid: 'share-on-twitter',
      text: t('shareOnTwitter'),
      icon: <Box component={Icon} icon={twitterIcon} sx={{ fontSize: 20 }} />,
      handle: () => {
        window.open(
          generateTwitterShareUrl({
            title: project.name || '',
            description: project.description || '',
            url: shareUrl,
            hashtags: ['Arcblock', 'AIGNE', 'AI'],
            via: 'ArcBlock_io',
          }),
          '_blank'
        );
        handleClose();
      },
    },
  ];
  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        data-testid="share-button"
        startIcon={<Box component={Icon} icon={Share2Icon} sx={{ fontSize: '1.2em!important' }} />}>
        {t('share')}
      </Button>
      <Popper open={open} anchorEl={anchorEl} placement="bottom-start">
        <ClickAwayListener onClickAway={handleClose}>
          <Paper sx={{ mt: 1 }}>
            <List>
              {shareOptions.map((item) => (
                <ListItem key={item.text} dense disablePadding onClick={item.handle} data-testid={item.testid}>
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
