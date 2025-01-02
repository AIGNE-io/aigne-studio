import { useProjectsState } from '@app/contexts/projects';
import { checkErrorType } from '@app/libs/util';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import {
  Avatar,
  AvatarGroup,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  avatarClasses,
  styled,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { getErrorMessage } from '../../../libs/api';
import type { ProjectWithUserInfo } from '../../../libs/project';
import { createProject, getProjectIconUrl } from '../../../libs/project';
import useDialog from '../../../utils/use-dialog';
import Close from '../icons/close';

export default function ImportFromTemplates({
  onClose,
  templates,
}: {
  onClose: () => void;
  templates: ProjectWithUserInfo[];
}) {
  const { t, locale } = useLocaleContext();
  const { dialog, showDialog } = useDialog();
  const navigate = useNavigate();
  const { createLimitDialog } = useProjectsState();

  return (
    <>
      <Dialog open disableEnforceFocus maxWidth="md" fullWidth component="form" onClose={onClose}>
        <DialogTitle className="between">
          <Box>{t('choose')}</Box>

          <IconButton size="small" onClick={() => onClose()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack overflow="auto" flexWrap="wrap" m="-6px" flexDirection="row">
            {templates.map((x) => {
              const { name, description, createdAt, id, users, updatedAt } = x;

              return (
                <ProjectItemRoot
                  gap={2}
                  key={id}
                  onClick={() => {
                    let name = '';
                    let description = '';

                    showDialog({
                      disableEnforceFocus: true,
                      fullWidth: true,
                      maxWidth: 'sm',
                      title: t('newObject', { object: t('project') }),
                      content: (
                        <Stack overflow="auto" gap={1.5}>
                          <Box>
                            <Typography variant="subtitle2">{t('projectSetting.name')}</Typography>
                            <TextField
                              autoFocus
                              label={t('projectSetting.name')}
                              sx={{ width: 1 }}
                              onChange={(e) => (name = e.target.value)}
                            />
                          </Box>

                          <Box>
                            <Typography variant="subtitle2">{t('projectSetting.description')}</Typography>
                            <TextField
                              label={t('projectSetting.description')}
                              multiline
                              rows={4}
                              sx={{ width: 1 }}
                              onChange={(e) => (description = e.target.value)}
                            />
                          </Box>
                        </Stack>
                      ),
                      cancelText: t('cancel'),
                      okText: t('create'),
                      okIcon: <RocketLaunchRoundedIcon />,
                      onOk: async () => {
                        try {
                          const project = await createProject({
                            blockletDid: x.blockletDid,
                            templateId: id,
                            name,
                            description,
                          });

                          currentGitStore.setState({ currentProjectId: project.id });
                          navigate(joinURL('/projects', project.id));
                        } catch (error) {
                          const message = getErrorMessage(error);
                          if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
                            createLimitDialog();
                          } else {
                            Toast.error(message);
                          }
                        }
                      },
                    });
                  }}>
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Box className="logo" sx={{ width: '72px', height: '72px' }}>
                      <Box
                        component="img"
                        alt=""
                        src={getProjectIconUrl(id, { blockletDid: x.blockletDid, updatedAt })}
                      />
                    </Box>

                    <Box flex={1} alignSelf="flex-start">
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Box className="name" sx={{ fontWeight: 600, fontSize: 18, lineHeight: '28px' }}>
                            {name || t('unnamed')}
                          </Box>
                        </Box>
                      </Box>

                      <Box className="desc" sx={{ fontWeight: 400, fontSize: 13, lineHeight: '22px' }}>
                        {description}
                      </Box>
                    </Box>
                  </Stack>

                  <Stack direction="row" gap={2} height={20} alignItems="center" justifyContent="space-between">
                    <Box display="flex" justifyContent="space-between" alignItems="center" width={1}>
                      <Stack
                        direction="row"
                        gap={2}
                        sx={{ fontSize: '12px', color: 'text.disabled' }}
                        alignItems="center">
                        {/* @ts-ignore */}
                        {createdAt && <RelativeTime value={createdAt} locale={locale} />}
                      </Stack>

                      {users && Array.isArray(users) && !!users.length && (
                        <AvatarGroup
                          total={users.length}
                          sx={{
                            [`.${avatarClasses.root}`]: { width: '20px', height: '20px', fontSize: '12px' },
                          }}>
                          {users.map((user) => {
                            const name = user.fullName || user.did;

                            return (
                              <Tooltip key={user.did} title={name} placement="top">
                                <Avatar alt={user.fullName} sx={{ borderWidth: '1px !important' }} src={user.avatar}>
                                  {name?.slice(0, 1)}
                                </Avatar>
                              </Tooltip>
                            );
                          })}
                        </AvatarGroup>
                      )}
                    </Box>
                  </Stack>
                </ProjectItemRoot>
              );
            })}
          </Stack>
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}

const ProjectItemRoot = styled(Stack)`
  cursor: pointer;
  overflow: hidden;
  padding: ${({ theme }) => theme.shape.borderRadius * 2}px;
  position: relative;
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.palette.divider};
  border-radius: 16px;
  max-width: calc(50% - 12px);
  width: 100%;
  margin: 6px;

  &.selected,
  &:hover {
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08);

    .action {
      display: flex;
    }
  }

  .logo {
    border-radius: ${({ theme }) => theme.shape.borderRadius}px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: ${({ theme }) => theme.shape.borderRadius}px;
    }
  }

  .name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .desc {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;
