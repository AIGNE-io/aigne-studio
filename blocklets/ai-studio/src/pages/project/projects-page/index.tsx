import { getProjectDataUrlInSpace } from '@app/libs/did-spaces';
import currentGitStore, { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
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
  avatarClasses,
  styled,
} from '@mui/material';
import { MouseEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import Project from '../../../../api/src/store/models/project';
import DeleteDialog from '../../../components/delete-confirm/dialog';
import { useProjectsState } from '../../../contexts/projects';
import { useReadOnly, useSessionContext } from '../../../contexts/session';
import { getErrorMessage } from '../../../libs/api';
import { ProjectWithUserInfo, User, createProject, getProjectIconUrl } from '../../../libs/project';
import useDialog from '../../../utils/use-dialog';
import Add from '../icons/add';
import ChevronDown from '../icons/chevron-down';
import DidSpacesLogo from '../icons/did-spaces';
import Duplicate from '../icons/duplicate';
import Edit from '../icons/edit';
import Empty from '../icons/empty';
import Pin from '../icons/pin';
import PinOff from '../icons/pin-off';
import Trash from '../icons/trash';
import FromDidSpacesImport from './from-did-spaces-import';
import ImportFromGit from './import-from-git';

const CARD_HEIGHT = 160;
const MAX_WIDTH = 300;

const gap = { xs: 2, sm: 3 };
const mt = { xs: 3, sm: 4 };

export default function ProjectsPage() {
  const { t } = useLocaleContext();

  const {
    state: { loading, templates, projects, examples },
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
            <ProjectList section="templates" list={templates} />
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
            <ProjectList section="projects" list={projects} />
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

        {examples && examples.length > 0 && (
          <Section enableCollapse title={t('examples')}>
            <ProjectList section="examples" list={examples} />
          </Section>
        )}
      </Stack>
    </Stack>
  );
}

function ProjectMenu() {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const [deleteItem, setDeleteItem] = useState<null | { project: Project; isReset?: boolean }>();
  const { dialog, showDialog } = useDialog();

  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: getDefaultBranch() });

  const {
    state: { menuAnchor, projects, templates, examples },
    createProject,
    deleteProject,
    updateProject,
    setMenuAnchor,
  } = useProjectsState();

  const item =
    menuAnchor &&
    (projects.find((i) => i._id === menuAnchor.id) ??
      templates.find((i) => i._id === menuAnchor.id) ??
      examples.find((i) => i._id === menuAnchor.id));

  const onDelete = ({ isReset }: { isReset?: boolean } = {}) => {
    if (!item) return;
    setDeleteItem({ project: item, isReset });
  };

  const menus = useMemo(() => {
    if (!item) return [];

    const result: {
      visible?: (item: ProjectWithUserInfo) => boolean;
      title: ReactNode;
      icon: ReactNode;
      color?: string;
      onClick: () => any;
    }[][] = [
      [
        {
          visible: () => menuAnchor?.section === 'projects',
          title: t('alert.edit'),
          icon: <Edit />,
          onClick: () => {
            const id = menuAnchor?.id;
            if (!id) return;
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
                updateProject(id, { name, description })
                  .catch((error) => {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  })
                  .finally(() => {
                    setMenuAnchor(undefined);
                  });
              },
            });
          },
        },
        {
          visible: () => menuAnchor?.section === 'projects' || menuAnchor?.section === 'examples',
          title: t('duplicate'),
          icon: <Duplicate />,
          onClick: async () => {
            await createProject({
              templateId: menuAnchor!.id,
              name: `${item?.name || 'Unnamed'} Copy`,
              description: item?.description,
            })
              .catch((error) => {
                Toast.error(getErrorMessage(error));
                throw error;
              })
              .finally(() => {
                setMenuAnchor(undefined);
              });
          },
        },
        {
          visible: () => menuAnchor?.section === 'projects',
          title: item?.pinnedAt ? t('unpin') : t('pin'),
          icon: item?.pinnedAt ? <PinOff /> : <Pin />,
          onClick: async () => {
            const id = menuAnchor?.id;
            if (!id) return;
            await updateProject(id, { pinned: !item?.pinnedAt })
              .catch((error) => {
                Toast.error(getErrorMessage(error));
                throw error;
              })
              .finally(() => {
                setMenuAnchor(undefined);
              });
          },
        },
      ],
      [
        {
          visible: () => menuAnchor.section === 'projects',
          icon: <Trash color="inherit" />,
          title: t('delete'),
          color: 'warning.main',
          onClick: () => {
            onDelete();
            setMenuAnchor(undefined);
          },
        },
        {
          visible: () => menuAnchor.section === 'examples' && !item.isFromResource && !!item.duplicateFrom,
          icon: <Box component={Icon} icon="system-uicons:reset" fontSize={20} color="warning.main" />,
          title: t('reset'),
          color: 'warning.main',
          onClick: () => {
            onDelete({ isReset: true });
            setMenuAnchor(undefined);
          },
        },
      ],
    ];

    return result.map((i) => i.filter((j) => j.visible?.(item) ?? true)).filter((i) => !!i.length);
  }, [t, item, menuAnchor]);

  return (
    <>
      <Popper
        key={menuAnchor?.id}
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor?.anchor}
        placement="right-start"
        sx={{ ml: '4px !important', zIndex: (theme) => theme.zIndex.drawer }}>
        <ClickAwayListener onClickAway={() => setMenuAnchor(undefined)}>
          <Paper>
            <List dense>
              {menus.map((group, i) => {
                const submenus = group.map((menu, j) => (
                  <LoadingMenuItem
                    key={`${i}-${j}`}
                    disabled={readOnly}
                    onClick={menu.onClick}
                    sx={{ color: menu.color, svg: { color: menu.color } }}>
                    <ListItemIcon>{menu.icon}</ListItemIcon>
                    {menu.title}
                  </LoadingMenuItem>
                ));

                if (i !== menus.length - 1) {
                  submenus.push(<Divider key={`divider-${i}`} />);
                }

                return submenus;
              })}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>

      {deleteItem && (
        <DeleteDialog
          name={deleteItem.project?.name || deleteItem.project._id}
          isReset={deleteItem.isReset}
          onClose={() => {
            setDeleteItem(null);
          }}
          onConfirm={async () => {
            try {
              await deleteProject(deleteItem.project._id!);
              setDeleteItem(null);
              if (projectId === deleteItem.project._id) {
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
          pl: 1.5,
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

      <Collapse in={enableCollapse ? templatesVisible : true} sx={{ mt: 1, position: 'relative' }}>
        {children}
      </Collapse>
    </Box>
  );
}

function ProjectList({
  section,
  list,
}: {
  section: 'templates' | 'examples' | 'projects';
  list: ProjectWithUserInfo[];
}) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { dialog, showDialog } = useDialog();
  const [itemLoading, setLoading] = useState<ProjectWithUserInfo | null>(null);

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
              className={cx(menuOpen && 'selected')}
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
              gitUrl={item.gitUrl}
              model={item.model}
              users={item.users || []}
              didSpaceAutoSync={Boolean(item.didSpaceAutoSync)}
              loading={Boolean(itemLoading && item?._id === itemLoading?._id)}
              isFromResource={Boolean(item.isFromResource)}
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
                      const project = await createProject({ templateId: item._id, name, description });
                      currentGitStore.setState({
                        currentProjectId: project._id,
                      });
                      navigate(joinURL('/projects', project._id));
                    },
                  });
                } else if (section === 'projects') {
                  currentGitStore.setState({
                    currentProjectId: item._id,
                  });
                  navigate(joinURL('/projects', item._id!));
                } else if (section === 'examples') {
                  if (!item.duplicateFrom) {
                    try {
                      setLoading(item);
                      const project = await createProject({
                        withDuplicateFrom: true,
                        templateId: item._id!,
                        name: item.name,
                        description: item.description,
                      });
                      currentGitStore.setState({
                        currentProjectId: project._id,
                      });
                      navigate(joinURL('/projects', project._id!));
                    } catch (error) {
                      setLoading(null);
                    }
                  } else {
                    currentGitStore.setState({
                      currentProjectId: item._id,
                    });
                    navigate(joinURL('/projects', item._id!));
                  }
                }
              }}
              actions={
                section !== 'templates' && (
                  <IconButton
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

        {section === 'templates' && (
          <>
            <ImportFromGit /> <FromDidSpacesImport />
          </>
        )}
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
  section,
  gitUrl,
  model,
  users,
  loading = false,
  didSpaceAutoSync,
  id,
  isFromResource,
  ...props
}: {
  section: string;
  pinned?: boolean;
  icon?: string;
  name?: string;
  description?: string;
  updatedAt?: string | Date;
  createdAt?: string | Date;
  gitUrl?: string;
  model?: string;
  users?: User[];
  actions?: ReactNode;
  loading: boolean;
  didSpaceAutoSync: true | false;
  id: string;
  isFromResource: boolean;
} & StackProps) {
  const { t, locale } = useLocaleContext();
  const { session } = useSessionContext();

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

  const projectDataUrlInSpace = useMemo(() => {
    return getProjectDataUrlInSpace(session?.user?.didSpace?.endpoint, id);
  }, [session?.user?.didSpace?.endpoint, id]);

  if (section === 'templates') {
    return (
      <Tooltip title={description}>
        <ProjectItemRoot
          {...props}
          className={cx(props.className)}
          minHeight={CARD_HEIGHT}
          justifyContent="center"
          alignItems="center">
          <Stack height={60} justifyContent="center" alignItems="center">
            {icon ? (
              <Box component="img" src={icon} sx={{ width: 60, height: 60, borderRadius: 1 }} />
            ) : id && isFromResource ? (
              <Box component="img" src={getProjectIconUrl(id)} sx={{ width: 60, height: 60, borderRadius: 1 }} />
            ) : (
              <Add sx={{ fontSize: 40, color: (theme) => theme.palette.text.disabled }} />
            )}
          </Stack>
          <Box sx={{ mt: 1, color: (theme) => theme.palette.text.secondary }}>{name}</Box>

          <Box className="action" sx={{ position: 'absolute', right: 8, bottom: 8 }}>
            {actions}
          </Box>
        </ProjectItemRoot>
      </Tooltip>
    );
  }

  return (
    <ProjectItemRoot {...props} className={cx(props.className)}>
      <Stack direction="row" gap={1} alignItems="center">
        <Box className="logo" sx={{ width: '32px', height: '32px' }}>
          {icon ? <Box component="img" src={icon} /> : <Box component="img" src={getProjectIconUrl(id)} />}
        </Box>

        <Box flex={1} />

        {users && Array.isArray(users) && !!users.length && (
          <AvatarGroup
            total={users.length}
            sx={{
              [`.${avatarClasses.root}`]: {
                width: '24px',
                height: '24px',
                fontSize: '12px',
              },
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

        {pinned && (
          <Tooltip title={t('pin')} placement="top">
            <Pin sx={{ fontSize: 14 }} />
          </Tooltip>
        )}
      </Stack>

      <Box flex={1} my={1.5}>
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
            mt: 0.5,
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
                display="inline-flex"
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
          {didSpaceAutoSync && projectDataUrlInSpace && (
            <Tooltip title="" placement="top">
              <Box
                display="inline-flex"
                alignItems="center"
                mt={0.25}
                ml={projectDataUrlInSpace ? -1.5 : 'inherit'}
                component="a"
                href={projectDataUrlInSpace}
                target="_blank"
                style={{ color: 'inherit', textDecoration: 'none' }}
                onClick={(e) => {
                  e.stopPropagation();
                }}>
                <DidSpacesLogo sx={{ fontSize: 16 }} />
              </Box>
            </Tooltip>
          )}
        </Stack>

        <Box mr={-0.5} className="action">
          {actions}
        </Box>
      </Stack>

      {loading && (
        <Box
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          right={0}
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex={(theme) => theme.zIndex.tooltip}>
          <CircularProgress size={16} />
        </Box>
      )}
    </ProjectItemRoot>
  );
}

const ProjectItemRoot = styled(Stack)`
  width: 100%;
  cursor: pointer;
  overflow: hidden;
  padding: ${({ theme }) => theme.shape.borderRadius * 1.5}px;
  position: relative;
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.palette.divider};
  border-radius: 16px;

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

  .action {
    display: none;
  }
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
