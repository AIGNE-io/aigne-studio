import { didSpaceReady, getProjectDataUrlInSpace } from '@app/libs/did-spaces';
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
  Button,
  CircularProgress,
  ClickAwayListener,
  Collapse,
  Divider,
  Grow,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuItemProps,
  MenuList,
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
  svgIconClasses,
} from '@mui/material';
import { MouseEvent, ReactNode, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import Project from '../../../../api/src/store/models/project';
import DeleteDialog from '../../../components/delete-confirm/dialog';
import { useProjectsState } from '../../../contexts/projects';
import { useReadOnly, useSessionContext } from '../../../contexts/session';
import { getErrorMessage } from '../../../libs/api';
import { ProjectWithUserInfo, User, createProject, getProjectIconUrl } from '../../../libs/project';
import useDialog from '../../../utils/use-dialog';
import ChevronDown from '../icons/chevron-down';
import DidSpacesLogo from '../icons/did-spaces';
import Duplicate from '../icons/duplicate';
import Edit from '../icons/edit';
import Github from '../icons/github';
import Pin from '../icons/pin';
import PinOff from '../icons/pin-off';
import PinOn from '../icons/pin-on';
import Plus from '../icons/plus';
import Template from '../icons/template';
import Trash from '../icons/trash';
import ImportFromBlank from './import-from-blank';
import ImportFromDidSpaces from './import-from-did-spaces';
import ImportFromGit from './import-from-git';
import ImportFromTemplates from './import-from-templates';

const CARD_HEIGHT = 140;
const MAX_WIDTH = 300;

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
    <Stack minHeight="100%" overflow="auto" bgcolor="#F9FAFB">
      <Stack m={2.5} flexGrow={1} gap={2.5}>
        <ProjectMenu />

        <Section title={t('myProjects')} section="projects" list={templates}>
          {projects.length ? (
            <ProjectList section="projects" list={projects} />
          ) : loading ? (
            <Stack direction="row" flexWrap="wrap" gap={2.5}>
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
            <Stack alignItems="center">
              <Box fontSize="18px" fontWeight="600" lineHeight="28px" color="#000000">
                💻
              </Box>
              <Box fontSize="13px" fontWeight="500" lineHeight="22px" color="#030712">
                {t('emptyProjectTitle')}
              </Box>
              <Box fontSize="12px" lineHeight="20px" color="#9CA3AF">
                {t('emptyProjectSubtitle')}
              </Box>
            </Stack>
          )}
        </Section>

        {examples && examples.length > 0 && (
          <Section title={t('examples')}>
            <ProjectList section="examples" list={examples} />
          </Section>
        )}
      </Stack>
    </Stack>
  );
}

function TemplatesProjects({ list }: { list?: ProjectWithUserInfo[] }) {
  const { session } = useSessionContext();
  const blank = (list || []).find((x) => !x.isFromResource);
  const resource = (list || []).filter((x) => x.isFromResource);
  const { t } = useLocaleContext();

  return (
    <Stack gap={1} flexDirection="row">
      <ButtonPopper
        list={
          <MenuList autoFocusItem>
            <ImportFromGit>
              <MenuItem>
                <Github sx={{ mr: 1, fontSize: 16, color: '#000' }} />
                <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('gitRepo')}</ListItemText>
              </MenuItem>
            </ImportFromGit>

            {didSpaceReady(session?.user) && (
              <ImportFromDidSpaces>
                <MenuItem onClick={() => {}}>
                  <DidSpacesLogo sx={{ mr: 1, fontSize: 16 }} />
                  <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('didSpaces.title')}</ListItemText>
                </MenuItem>
              </ImportFromDidSpaces>
            )}
          </MenuList>
        }>
        <Button
          sx={{
            bgcolor: '#fff',
            color: '#000',
            border: '1px solid #E5E7EB',
            fontSize: '13px',
            fontWeight: 500,
            p: '5px 12px',
          }}>
          {t('alert.import')}
        </Button>
      </ButtonPopper>

      <ButtonPopper
        list={
          <MenuList autoFocusItem>
            <ImportFromBlank item={blank}>
              <MenuItem>
                <Plus sx={{ mr: 1, fontSize: 16, color: '#000' }} />
                <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('blank')}</ListItemText>
              </MenuItem>
            </ImportFromBlank>

            {resource.length && (
              <ImportFromTemplates templates={resource}>
                <MenuItem>
                  <Template sx={{ mr: 1, fontSize: 16 }} />
                  <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('import.templates')}</ListItemText>
                </MenuItem>
              </ImportFromTemplates>
            )}
          </MenuList>
        }>
        <Button
          startIcon={<Plus sx={{}} />}
          sx={{
            bgcolor: '#000',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            p: '5px 12px',

            '&:hover': {
              bgcolor: '#000',
            },

            [`.${svgIconClasses.root}`]: {
              fontSize: '15px',
              fontWeight: 500,
              color: '#fff',
            },
          }}>
          {t('newProject')}
        </Button>
      </ButtonPopper>
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
                  <Box>
                    <Box fontWeight={500} fontSize={14} lineHeight="24px">
                      {t('projectSetting.name')}
                    </Box>
                    <TextField
                      autoFocus
                      label={t('projectSetting.name')}
                      defaultValue={item?.name || ''}
                      onChange={(e) => (name = e.target.value)}
                      sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                  </Box>

                  <Box>
                    <Box fontWeight={500} fontSize={14} lineHeight="24px">
                      {t('projectSetting.description')}
                    </Box>
                    <TextField
                      label={t('projectSetting.description')}
                      multiline
                      rows={4}
                      defaultValue={item?.description || ''}
                      onChange={(e) => (description = e.target.value)}
                      sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                  </Box>
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
          icon: item?.pinnedAt ? <PinOff /> : <PinOn />,
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
  section,
  enableCollapse,
  title,
  children,
  list,
}: {
  section?: string;
  enableCollapse?: boolean;
  title: ReactNode;
  children?: ReactNode;
  list?: ProjectWithUserInfo[];
}) {
  const [templatesVisible, setTemplatesVisible] = useState(true);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
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
          <Typography fontWeight="bold" fontSize="18px" lineHeight="28px">
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

        {section === 'projects' && <TemplatesProjects list={list} />}
      </Box>

      <Collapse in={enableCollapse ? templatesVisible : true} sx={{ position: 'relative' }}>
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
      <ProjectListContainer gap={1.5}>
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
                      backgroundColor: 'transparent',
                      color: '#3B82F6',
                      borderRadius: 1,
                      padding: 0,

                      '&:hover': {
                        backgroundColor: 'transparent',
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchor({ section, anchor: e.currentTarget, id: item._id! });
                    }}>
                    <MoreVertIcon fontSize="small" sx={{ fontSize: 20 }} />
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

  return (
    <ProjectItemRoot {...props} className={cx(props.className)} gap={2}>
      <Stack direction="row" gap={1.5} alignItems="center">
        <Box className="logo" sx={{ width: '72px', height: '72px' }}>
          {icon ? <Box component="img" src={icon} /> : <Box component="img" src={getProjectIconUrl(id)} />}
        </Box>

        <Box flex={1} width={0} alignSelf="flex-start">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={0.5} flex={1} width={0}>
              <Box className="name" sx={{ fontWeight: 600, fontSize: 18, lineHeight: '28px' }}>
                {name || t('unnamed')}
              </Box>

              {pinned && (
                <Tooltip title={t('pin')} placement="top">
                  <Pin />
                </Tooltip>
              )}
            </Box>

            <Box ml={1} width={24} display="flex" justifyContent="center" alignItems="center">
              <Box className="action">{actions}</Box>
            </Box>
          </Box>

          <Box
            className="desc"
            sx={{
              fontWeight: 400,
              fontSize: 13,
              lineHeight: '22px',
            }}>
            {description}
          </Box>
        </Box>
      </Stack>

      <Stack direction="row" gap={2} height={20} alignItems="center" justifyContent="space-between">
        <Box display="flex" justifyContent="space-between" alignItems="center" width={1}>
          <Stack direction="row" gap={2} sx={{ fontSize: '12px', color: 'text.disabled' }} alignItems="center">
            {createdAt && <RelativeTime value={createdAt} locale={locale} />}

            {!!formatGitUrl && (
              <Tooltip title={formatGitUrl} placement="top">
                <Box
                  display="inline-flex"
                  alignItems="center"
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
  padding: ${({ theme }) => theme.shape.borderRadius * 2}px;
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
      object-fit: cover;
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
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
`;

function ButtonPopper({ children, list }: { children: any; list?: any }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <Box ref={anchorRef}> {cloneElement(children, { onClick: handleToggle })}</Box>

      <Popper sx={{ zIndex: 1 }} open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>{list}</ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}
