import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { cx } from '@emotion/css';
import GitHubIcon from '@mui/icons-material/GitHub';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import {
  Avatar,
  AvatarGroup,
  Box,
  CircularProgress,
  ClickAwayListener,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItemIcon,
  MenuItem,
  MenuItemProps,
  Paper,
  Popper,
  Skeleton,
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { MouseEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { Project } from '../../../api/src/store/projects';
import DeleteDialog from '../../components/delete-confirm/dialog';
import { useProjectsState } from '../../contexts/projects';
import { useReadOnly } from '../../contexts/session';
import { getErrorMessage } from '../../libs/api';
import { createProject } from '../../libs/project';
import useDialog from '../../utils/use-dialog';
import Add from './icons/add';
import ChevronDown from './icons/chevron-down';
import Duplicate from './icons/duplicate';
import Edit from './icons/edit';
import Empty from './icons/empty';
import Picture from './icons/picture';
import Pin from './icons/pin';
import PinOff from './icons/pin-off';
import Trash from './icons/trash';
import { defaultBranch } from './state';

type User = {
  name?: string;
  email?: string;
  did?: string;
  fullName?: string;
  avatar?: string;
};

type ProjectWithUserInfo = Project & {
  users: User[];
  branches: string[];
  templateCount: number;
};

const CARD_HEIGHT = 140;
const MAX_WIDTH = 300;

const gap = { xs: 2, sm: 3 };
const mt = { xs: 3, sm: 4 };

export default function ProjectsPage() {
  const { t } = useLocaleContext();

  const {
    state: { loading, templates, projects },
    refetch,
  } = useProjectsState();

  useEffect(() => {
    refetch();
  }, []);

  return (
    <Stack minHeight="100%" overflow="auto">
      <Stack m={gap} flexGrow={1} gap={mt}>
        <ProjectMenu />

        <Section enableCollapse title={t('newFromTemplates')}>
          {templates.length ? (
            <ProjectList section="templates" list={templates as ProjectWithUserInfo[]} />
          ) : (
            loading && (
              <Stack direction="row" flexWrap="wrap" gap={gap}>
                <ProjectItemSkeleton
                  width={{ sm: 'calc(50% - 16px)', md: MAX_WIDTH }}
                  maxWidth={MAX_WIDTH}
                  height={CARD_HEIGHT}
                />
                <ProjectItemSkeleton
                  width={{ sm: 'calc(50% - 16px)', md: MAX_WIDTH }}
                  maxWidth={MAX_WIDTH}
                  height={CARD_HEIGHT}
                />
              </Stack>
            )
          )}
        </Section>

        <Section title={t('myProjects')}>
          {projects.length ? (
            <ProjectList section="projects" list={projects as ProjectWithUserInfo[]} />
          ) : loading ? (
            <Stack direction="row" flexWrap="wrap" gap={gap}>
              <ProjectItemSkeleton
                width={{ sm: 'calc(50% - 16px)', md: MAX_WIDTH }}
                maxWidth={MAX_WIDTH}
                height={CARD_HEIGHT}
              />
              <ProjectItemSkeleton
                width={{ sm: 'calc(50% - 16px)', md: MAX_WIDTH }}
                maxWidth={MAX_WIDTH}
                height={CARD_HEIGHT}
              />
            </Stack>
          ) : (
            <Stack alignItems="center" my={4}>
              <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
              <Typography color="text.disabled" my={2}>
                {t('noProjectTip')}
              </Typography>
            </Stack>
          )}
        </Section>
      </Stack>
    </Stack>
  );
}

function ProjectMenu() {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const [deleteItem, setDeleteItem] = useState<null | Project>();
  const { dialog, showDialog } = useDialog();

  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: defaultBranch });

  const {
    state: { menuAnchor, projects },
    createProject,
    deleteProject,
    updateProject,
    setMenuAnchor,
  } = useProjectsState();

  const item = menuAnchor && projects.find((i) => i._id === menuAnchor.id);

  const onDelete = () => {
    if (!item) return;
    setDeleteItem(item);
  };

  return (
    <>
      <Popper
        key={menuAnchor?.id}
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor?.anchor}
        placement="right-start"
        sx={{ ml: '4px !important' }}>
        <ClickAwayListener onClickAway={() => setMenuAnchor(undefined)}>
          <Paper>
            <List dense>
              {menuAnchor?.section === 'projects' && (
                <LoadingMenuItem
                  disabled={readOnly}
                  onClick={() => {
                    setMenuAnchor(undefined);

                    let name = item?.name || '';
                    let description = item?.description || '';

                    showDialog({
                      disableEnforceFocus: true,
                      fullWidth: true,
                      maxWidth: 'sm',
                      title: `${t('alert.edit')} ${t('form.project')}`,
                      content: (
                        <Stack overflow="auto" gap={2}>
                          <TextField
                            autoFocus
                            label={t('projectSetting.name')}
                            sx={{ width: 1 }}
                            defaultValue={item?.name || ''}
                            onChange={(e) => (name = e.target.value)}
                          />

                          <TextField
                            label={t('projectSetting.description')}
                            multiline
                            rows={4}
                            sx={{ width: 1 }}
                            defaultValue={item?.description || ''}
                            onChange={(e) => (description = e.target.value)}
                          />
                        </Stack>
                      ),
                      cancelText: t('alert.cancel'),
                      okText: t('save'),
                      okIcon: <SaveRoundedIcon />,
                      onOk: async () => {
                        updateProject(menuAnchor.id, { name, description })
                          .catch((error) => {
                            Toast.error(getErrorMessage(error));
                            throw error;
                          })
                          .finally(() => {
                            setMenuAnchor(undefined);
                          });
                      },
                    });
                  }}>
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  {`${t('alert.edit')}`}
                </LoadingMenuItem>
              )}

              <LoadingMenuItem
                disabled={readOnly}
                onClick={() =>
                  createProject({ duplicateFrom: menuAnchor!.id })
                    .catch((error) => {
                      Toast.error(getErrorMessage(error));
                      throw error;
                    })
                    .finally(() => {
                      setMenuAnchor(undefined);
                    })
                }>
                <ListItemIcon>
                  <Duplicate />
                </ListItemIcon>
                {t('duplicate')}
              </LoadingMenuItem>

              {menuAnchor?.section === 'projects' && (
                <LoadingMenuItem
                  disabled={readOnly}
                  onClick={() =>
                    updateProject(menuAnchor.id, { pinned: !item?.pinnedAt })
                      .catch((error) => {
                        Toast.error(getErrorMessage(error));
                        throw error;
                      })
                      .finally(() => {
                        setMenuAnchor(undefined);
                      })
                  }>
                  <ListItemIcon>{item?.pinnedAt ? <PinOff /> : <Pin />}</ListItemIcon>
                  {item?.pinnedAt ? t('unpin') : t('pin')}
                </LoadingMenuItem>
              )}

              <Divider />

              <MenuItem
                disabled={readOnly}
                sx={{ color: 'warning.main' }}
                onClick={() => {
                  onDelete();
                  setMenuAnchor(undefined);
                }}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <Trash color="inherit" />
                </ListItemIcon>
                {t('delete')}
              </MenuItem>
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>

      {deleteItem && (
        <DeleteDialog
          name={deleteItem?.name || deleteItem._id!}
          onClose={() => {
            setDeleteItem(null);
          }}
          onConfirm={async () => {
            try {
              await deleteProject(deleteItem._id!);
              setDeleteItem(null);
              if (projectId === deleteItem._id) {
                navigate('/projects', { replace: true });
              }
            } catch (error) {
              Toast.error(getErrorMessage(error));
              throw error;
            }
          }}
        />
      )}

      {dialog}
    </>
  );
}

function Section({
  enableCollapse,
  title,
  children,
}: {
  enableCollapse?: boolean;
  title: ReactNode;
  children?: ReactNode;
}) {
  const [templatesVisible, setTemplatesVisible] = useState(true);

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          cursor: enableCollapse ? 'pointer' : 'default',
          alignItems: 'center',
          gap: 1,
        }}
        onClick={() => setTemplatesVisible(!templatesVisible)}>
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>

        {enableCollapse && (
          <IconButton size="small" sx={{ m: 0, p: 0 }}>
            <ChevronDown
              sx={{
                transform: `rotateZ(${templatesVisible ? '-180deg' : '0deg'})`,
                transition: (theme) => theme.transitions.create('all'),
              }}
            />
          </IconButton>
        )}
      </Stack>

      <Collapse in={enableCollapse ? templatesVisible : true} sx={{ mt, position: 'relative' }}>
        {children}
      </Collapse>
    </Box>
  );
}

function ProjectList({
  section,
  list,
}: { section: 'templates'; list: ProjectWithUserInfo[] } | { section: 'projects'; list: ProjectWithUserInfo[] }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { dialog, showDialog } = useDialog();

  const {
    state: { menuAnchor },
    setMenuAnchor,
  } = useProjectsState();

  return (
    <>
      <ProjectListContainer gap={gap}>
        {list.map((item) => {
          const menuOpen = menuAnchor?.section === section && menuAnchor?.id === item._id;

          return (
            <ProjectItem
              section={section}
              id={item._id!}
              tabIndex={0}
              key={item._id}
              pinned={!!item.pinnedAt}
              height={CARD_HEIGHT}
              icon={item.icon}
              name={section === 'templates' && item.name ? t(item.name) : item.name}
              description={item.description}
              updatedAt={item.updatedAt}
              createdAt={item.createdAt}
              templateCount={item.templateCount}
              branches={item.branches || []}
              gitUrl={item.gitUrl}
              model={item.model}
              users={item.users || []}
              onClick={async () => {
                if (section === 'templates') {
                  let name = '';
                  let description = '';

                  showDialog({
                    disableEnforceFocus: true,
                    fullWidth: true,
                    maxWidth: 'sm',
                    title: t('newObject', { object: t('form.project') }),
                    content: (
                      <Stack overflow="auto" gap={2}>
                        <TextField
                          autoFocus
                          label={t('projectSetting.name')}
                          sx={{ width: 1 }}
                          onChange={(e) => (name = e.target.value)}
                        />

                        <TextField
                          label={t('projectSetting.description')}
                          multiline
                          rows={4}
                          sx={{ width: 1 }}
                          onChange={(e) => (description = e.target.value)}
                        />
                      </Stack>
                    ),
                    cancelText: t('alert.cancel'),
                    okText: t('create'),
                    okIcon: <RocketLaunchRoundedIcon />,
                    onOk: async () => {
                      const project = await createProject({ templateId: item._id!, name, description });
                      navigate(joinURL('/projects', project._id!));
                    },
                  });
                } else if (section === 'projects') {
                  navigate(joinURL('/projects', item._id!));
                }
              }}
              actions={
                section === 'projects' && (
                  <IconButton
                    className={cx(!menuOpen && 'hover-visible')}
                    size="small"
                    sx={{
                      backgroundColor: (theme) => theme.palette.background.paper,
                      color: (theme) => theme.palette.text.disabled,
                      borderRadius: 1,
                      padding: 0,

                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.background.paper,
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchor({ section, anchor: e.currentTarget, id: item._id! });
                    }}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )
              }
              sx={{
                '&:focus-visible': {
                  outline: 0,
                },
              }}
            />
          );
        })}
      </ProjectListContainer>
      {dialog}
    </>
  );
}

function ProjectItemSkeleton({ ...props }: StackProps) {
  return (
    <ProjectItemRoot {...props}>
      <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between" mb={2}>
        <Skeleton width="100%" variant="text" height={28} />
      </Stack>

      <Stack direction="row" gap={2}>
        <Skeleton variant="rectangular" width={64} height={64} />

        <Stack width={0} flex={1}>
          <Skeleton width="100%" variant="text" height={28} />
          <Skeleton width="100%" variant="text" height={28} />
        </Stack>
      </Stack>
    </ProjectItemRoot>
  );
}

function ProjectItem({
  pinned,
  icon,
  name,
  description,
  updatedAt,
  createdAt,
  actions,
  mainActions,
  section,
  templateCount,
  branches,
  gitUrl,
  model,
  users,
  ...props
}: {
  section: string;
  pinned?: boolean;
  icon?: string;
  name?: string;
  description?: string;
  updatedAt?: string | Date;
  createdAt?: string | Date;
  templateCount: number;
  branches: string[];
  gitUrl?: string;
  model?: string;
  users?: User[];
  actions?: ReactNode;
  mainActions?: ReactNode;
} & StackProps) {
  const { t, locale } = useLocaleContext();

  const formatGitUrl = useMemo(() => {
    try {
      if (gitUrl) {
        const u = new URL(gitUrl);
        u.username = '';
        return u.toString();
      }

      return '';
    } catch {
      return '';
    }
  }, [gitUrl]);

  if (section === 'templates') {
    return (
      <ProjectItemRoot
        {...props}
        className={cx(props.className)}
        minHeight={CARD_HEIGHT}
        justifyContent="center"
        alignItems="center">
        <Add sx={{ fontSize: 40, color: (theme) => theme.palette.text.disabled }} />
        <Box sx={{ color: (theme) => theme.palette.text.secondary }}>
          {t('newObject', { object: t('form.project') })}
        </Box>
      </ProjectItemRoot>
    );
  }

  return (
    <ProjectItemRoot {...props} className={cx(props.className)}>
      <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between">
        <Box className="logo" sx={{ width: '24px', height: '24px' }}>
          {icon ? <Box component="img" src={icon} /> : <Picture sx={{ color: 'grey.400', fontSize: 24 }} />}
        </Box>

        {users && Array.isArray(users) && !!users.length && (
          <AvatarGroup total={users.length}>
            {users.map((user: User) => {
              const name = user.name || user.did;

              return (
                <Tooltip title={user.name} key={user.name} placement="top">
                  <CustomAvatar alt={user.name} sx={{ borderWidth: '1px !important' }}>
                    {name ? name[0] : ''}
                  </CustomAvatar>
                </Tooltip>
              );
            })}
          </AvatarGroup>
        )}

        {pinned && (
          <Tooltip title={t('pin')} placement="top">
            <Pin sx={{ fontSize: 14 }} />
          </Tooltip>
        )}
      </Stack>

      <Box flex={1} my={1}>
        <Box
          className="name"
          sx={{
            fontWeight: (theme) => theme.typography.fontWeightBold,
            fontSize: (theme) => theme.typography.subtitle1.fontSize,
          }}>
          {name || t('unnamed')}
        </Box>

        <Box
          className="desc"
          sx={{
            color: (theme) => theme.palette.text.secondary,
            fontSize: (theme) => theme.typography.caption.fontSize,
          }}>
          {description}
        </Box>
      </Box>

      <Stack direction="row" gap={2} height={20} alignItems="center" justifyContent="space-between">
        <Stack
          direction="row"
          gap={2}
          sx={{ fontSize: (theme) => theme.typography.caption.fontSize, color: 'text.disabled' }}>
          {createdAt && (
            <Box>
              <RelativeTime value={createdAt} locale={locale} />
            </Box>
          )}

          {!!formatGitUrl && (
            <Tooltip title={formatGitUrl} placement="top">
              <Box
                display="flex"
                alignItems="center"
                mt={0.25}
                component="a"
                href={formatGitUrl}
                target="_blank"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                }}>
                <GitHubIcon sx={{ fontSize: 16 }} />
              </Box>
            </Tooltip>
          )}
        </Stack>

        <Box mr={-0.5} className="action">
          {(actions || mainActions) && (
            <Stack direction="row">
              {mainActions}
              {actions}
            </Stack>
          )}
        </Box>
      </Stack>
    </ProjectItemRoot>
  );
}

const ProjectItemRoot = styled(Stack)`
  width: 100%;
  cursor: pointer;
  overflow: hidden;
  padding: 8px 16px;
  position: relative;
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.palette.divider};
  border-radius: 16px;
  background: ${({ theme }) => theme.palette.background.paper};

  &:hover {
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08);

    .action {
      display: flex;
    }
  }

  .logo {
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: ${({ theme }) => theme.shape.borderRadius * 2}px;
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

  .action {
    display: none;
  }
`;

const CustomAvatar = styled(Avatar)`
  width: 22px;
  height: 22px;
  border-width: 1px;
  font-size: 12px;
`;

function LoadingMenuItem({ ...props }: MenuItemProps) {
  const [loading, setLoading] = useState(false);

  const onClick = (e: MouseEvent<HTMLLIElement>) => {
    if (loading) return;

    const res: Promise<any> | undefined = props.onClick?.(e) as any;
    if (typeof res?.finally === 'function') {
      setLoading(true);
      res.finally(() => {
        setLoading(false);
      });
    }
  };

  return (
    <MenuItem {...props} onClick={onClick}>
      {props.children}

      <Box flex={1} width={16} height={16} textAlign="right" ml={1}>
        {loading && <CircularProgress size={16} />}
      </Box>
    </MenuItem>
  );
}

const ProjectListContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
`;
