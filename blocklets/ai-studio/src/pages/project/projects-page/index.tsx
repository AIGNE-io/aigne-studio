import useSpaceInfo from '@app/hooks/use-space-info';
import { getProjectDataUrlInSpace } from '@app/libs/did-spaces';
import { checkErrorType } from '@app/libs/util';
import { useProjectStore } from '@app/pages/project/yjs-state';
import currentGitStore, { getDefaultBranch } from '@app/store/current-git-store';
import { EVENTS } from '@arcblock/did-connect/lib/Session/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import GithubIcon from '@iconify-icons/tabler/brand-github';
import BrandGithubFilledIcon from '@iconify-icons/tabler/brand-github-filled';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import CopyIcon from '@iconify-icons/tabler/copy';
import DotsVerticalIcon from '@iconify-icons/tabler/dots-vertical';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PinIcon from '@iconify-icons/tabler/pin';
import PinnedOffIcon from '@iconify-icons/tabler/pinned-off';
import PlusIcon from '@iconify-icons/tabler/plus';
import RefreshIcon from '@iconify-icons/tabler/refresh';
import TransferIcon from '@iconify-icons/tabler/transfer-in';
import TrashIcon from '@iconify-icons/tabler/trash';
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
} from '@mui/material';
import { MouseEvent, ReactNode, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAsync } from 'react-use';
import { joinURL } from 'ufo';

import Project from '../../../../api/src/store/models/project';
import DeleteDialog from '../../../components/delete-confirm/dialog';
import { useProjectsState } from '../../../contexts/projects';
import { useReadOnly, useSessionContext } from '../../../contexts/session';
import { getErrorMessage } from '../../../libs/api';
import { ProjectWithUserInfo, User, createProject, getProjectIconUrl } from '../../../libs/project';
import useDialog from '../../../utils/use-dialog';
import DidSpacesLogo from '../icons/did-spaces';
import Pin from '../icons/pin';
import NameField from './components/name-field';
import ImportFromBlank from './import-from-blank';
import ImportFromDidSpaces, { FROM_DID_SPACES_IMPORT, SelectDidSpacesImportWay } from './import-from-did-spaces';
import ImportFromGit from './import-from-git';

const CARD_HEIGHT = 140;
const MAX_WIDTH = 300;

export default function ProjectsPage() {
  const { t } = useLocaleContext();
  const { session, events } = useSessionContext();

  const [searchParams] = useSearchParams();
  const endpoint = searchParams.get('endpoint');
  const action = searchParams.get('action');

  const [showSelectDidSpacesImportWay, setShowSelectDidSpacesImportWay] = useState(false);

  useEffect(() => {
    console.error('debug233.EVENTS', EVENTS);
    events.on(EVENTS.DID_SPACE_CONNECTED, () => {
      console.error('debug233.DID_SPACE_CONNECTED', 'ok');
      if (action === FROM_DID_SPACES_IMPORT) {
        setTimeout(() => setShowSelectDidSpacesImportWay(true), 3000);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    state: { loading, projects },
    refetch,
    clearState,
  } = useProjectsState();

  useEffect(() => {
    refetch();

    return clearState;
  }, [session?.user?.did, session?.user?.role]);

  return (
    <Stack minHeight="100%" overflow="auto" bgcolor="#F9FAFB">
      <Stack m={2.5} flexGrow={1} gap={2.5}>
        <ProjectMenu />

        {endpoint && <ImportFromDidSpaces />}

        {showSelectDidSpacesImportWay && (
          <SelectDidSpacesImportWay onClose={() => setShowSelectDidSpacesImportWay(false)} />
        )}

        <Section title={t('myProjects')} section="projects" list={projects}>
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
            <Stack alignItems="center" mt="15%" gap={4}>
              <Typography variant="h4">{t('projectToGetStart')}</Typography>
              <ProjectsActionButton />
            </Stack>
          )}
        </Section>
      </Stack>
    </Stack>
  );
}

function ProjectsActionButton() {
  const { t } = useLocaleContext();
  const [dialog, setDialog] = useState<any>(null);
  const { checkProjectLimit } = useProjectsState();

  return (
    <>
      <Stack gap={1} flexDirection="row">
        <ButtonPopper
          onClick={checkProjectLimit}
          list={
            <MenuList autoFocusItem>
              <MenuItem
                onClick={() => {
                  setDialog(<ImportFromGit onClose={() => setDialog(null)} />);
                }}>
                <Box component={Icon} icon={GithubIcon} sx={{ mr: 1 }} />
                <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('gitRepo')}</ListItemText>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  setDialog(<SelectDidSpacesImportWay onClose={() => setDialog(null)} />);
                }}>
                <DidSpacesLogo sx={{ mr: 1, fontSize: 14 }} />
                <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('didSpaces.title')}</ListItemText>
              </MenuItem>
            </MenuList>
          }>
          <Button variant="outlined" startIcon={<Box component={Icon} icon={TransferIcon} />}>
            {t('alert.import')}
          </Button>
        </ButtonPopper>

        <Button
          data-testid="newProject"
          startIcon={<Box component={Icon} icon={PlusIcon} />}
          variant="contained"
          onClick={() => {
            checkProjectLimit();
            setDialog(<ImportFromBlank onClose={() => setDialog(null)} />);
          }}>
          {t('newObject', { object: t('project') })}
        </Button>
      </Stack>

      {dialog}
    </>
  );
}

function DeleteDialogConfirm({
  deleteItem,
  onClose,
  onConfirm,
}: {
  deleteItem: { project: Project; isReset?: boolean };
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { indexeddb } = useProjectStore(deleteItem.project.id, getDefaultBranch());

  return (
    <DeleteDialog
      name={deleteItem.project?.name || deleteItem.project.id}
      isReset={deleteItem.isReset}
      onClose={onClose}
      onConfirm={async () => {
        try {
          await Promise.all([indexeddb.clearData(), indexeddb.destroy()]).catch((error) => console.error(error));

          await onConfirm();
        } catch (error) {
          Toast.error(getErrorMessage(error));
          throw error;
        }
      }}
    />
  );
}

function ProjectMenu() {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const [deleteItem, setDeleteItem] = useState<null | { project: Project; isReset?: boolean }>();

  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: getDefaultBranch() });

  const {
    state: { menuAnchor, projects, templates, examples },
    refetch,
    createProject,
    deleteProject,
    updateProject,
    setMenuAnchor,
    checkProjectLimit,
    createLimitDialog,
  } = useProjectsState();

  const getNewProjectName = (name: string) => {
    let index = 0;

    while (true) {
      const n = index ? `${name} ${index}` : name;
      index++;

      const found = projects.find((i) => i.name === n);
      if (!found) {
        name = n;
        break;
      }
    }

    return name;
  };

  const item =
    menuAnchor &&
    (projects.find((i) => i.id === menuAnchor.id && i.blockletDid === menuAnchor.blockletDid) ??
      templates.find((i) => i.id === menuAnchor.id && i.blockletDid === menuAnchor.blockletDid) ??
      examples.find((i) => i.id === menuAnchor.id && i.blockletDid === menuAnchor.blockletDid));

  const form = useForm({ defaultValues: { name: '', description: '' } });
  const { dialog, showDialog, closeDialog } = useDialog();

  const onDelete = ({ isReset }: { isReset?: boolean } = {}) => {
    if (!item) return;
    setDeleteItem({ project: item, isReset });
  };

  const menus = useMemo(() => {
    if (!item) return [];

    const result: {
      dataTestId: string;
      visible?: (item: ProjectWithUserInfo) => boolean;
      title: ReactNode;
      icon: ReactNode;
      color?: string;
      onClick: () => any;
    }[][] = [
      [
        {
          dataTestId: 'projects-item-edit-button',
          visible: () => menuAnchor?.section === 'projects',
          title: t('alert.edit'),
          icon: <Box component={Icon} icon={PencilIcon} />,
          onClick: () => {
            const id = menuAnchor?.id;
            if (!id) return;
            setMenuAnchor(undefined);
            form.reset({ name: item?.name ?? '', description: item?.description ?? '' });

            showDialog({
              disableEnforceFocus: true,
              fullWidth: true,
              maxWidth: 'sm',
              form,
              title: `${t('alert.edit')} ${t('project')}`,
              content: (
                <Stack overflow="auto" gap={2}>
                  <Box>
                    <Typography variant="subtitle2">{t('projectSetting.name')}</Typography>
                    <NameField form={form} projectId={item?.id} beforeDuplicateProjectNavigate={() => closeDialog()} />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2">{t('projectSetting.description')}</Typography>
                    <TextField
                      multiline
                      rows={4}
                      defaultValue={item?.description || ''}
                      sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                      {...form.register('description')}
                    />
                  </Box>
                </Stack>
              ),
              cancelText: t('cancel'),
              okText: t('save'),
              okIcon: <SaveRoundedIcon />,
              onOk: async ({ name, description }) => {
                await updateProject(id, { name, description })
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
          dataTestId: 'projects-item-copy-button',
          visible: () => menuAnchor?.section === 'projects' || menuAnchor?.section === 'examples',
          title: t('copyToMyProjects'),
          icon: <Box component={Icon} icon={CopyIcon} />,
          onClick: async () => {
            checkProjectLimit();

            await createProject({
              blockletDid: menuAnchor.blockletDid,
              templateId: menuAnchor.id,
              name: getNewProjectName(`${item?.name || 'Unnamed'} Copy`),
              description: item?.description,
            })
              .catch((error) => {
                const message = getErrorMessage(error);
                if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
                  createLimitDialog();
                } else {
                  Toast.error(message);
                }

                throw error;
              })
              .finally(() => {
                refetch();
                setMenuAnchor(undefined);
              });
          },
        },
        {
          dataTestId: 'projects-item-pin-button',
          visible: () => menuAnchor?.section === 'projects',
          title: item?.pinnedAt ? t('unpin') : t('pin'),
          icon: item?.pinnedAt ? (
            <Box component={Icon} icon={PinnedOffIcon} />
          ) : (
            <Box component={Icon} icon={PinIcon} />
          ),
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
          dataTestId: 'projects-item-delete-button',
          visible: () => menuAnchor.section === 'projects',
          icon: <Box component={Icon} icon={TrashIcon} color="warning.main" />,
          title: t('delete'),
          color: 'warning.main',
          onClick: () => {
            onDelete();
            setMenuAnchor(undefined);
          },
        },
        {
          dataTestId: 'projects-item-reset-button',
          visible: () => menuAnchor.section === 'examples' && !item.blockletDid && !!item.duplicateFrom,
          icon: <Box component={Icon} icon={RefreshIcon} color="warning.main" />,
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
        data-testid="projects-item-menu"
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
                    sx={{ color: menu.color, svg: { color: menu.color } }}
                    data-testid={menu.dataTestId}>
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
        <DeleteDialogConfirm
          deleteItem={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={async () => {
            await deleteProject(deleteItem.project.id!);
            setDeleteItem(null);
            if (projectId === deleteItem.project.id) {
              navigate('/projects', { replace: true });
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
    <Stack gap={1.5}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
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
          <Typography variant="subtitle1">{title}</Typography>

          {enableCollapse && (
            <IconButton size="small" sx={{ m: 0, p: 0 }}>
              <Box
                component={Icon}
                icon={ChevronDownIcon}
                sx={{
                  transform: `rotateZ(${templatesVisible ? '-180deg' : '0deg'})`,
                  transition: (theme) => theme.transitions.create('all'),
                }}
              />
            </IconButton>
          )}
        </Stack>

        {section === 'projects' && !!list?.length && <ProjectsActionButton />}
      </Box>

      <Collapse in={enableCollapse ? templatesVisible : true} sx={{ position: 'relative' }}>
        {children}
      </Collapse>
    </Stack>
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
    checkProjectLimit,
    createLimitDialog,
  } = useProjectsState();

  return (
    <>
      <ProjectListContainer data-testid={`projects-${section}`} gap={1.5}>
        {list.map((item) => {
          const menuOpen = menuAnchor?.section === section && menuAnchor?.id === item.id;

          return (
            <ProjectItem
              data-testid={`projects-${section}-item`}
              className={cx(menuOpen && 'selected', `projects-${section}-item`)}
              section={section}
              id={item.id!}
              tabIndex={0}
              key={item.id}
              pinned={!!item.pinnedAt}
              name={item.name}
              description={item.description}
              updatedAt={item.iconVersion || item.updatedAt}
              createdAt={item.createdAt}
              gitUrl={item.gitUrl}
              users={item.users || []}
              didSpaceAutoSync={Boolean(item.didSpaceAutoSync)}
              loading={Boolean(itemLoading && item?.id === itemLoading?.id)}
              blockletDid={item.blockletDid}
              onClick={async (e) => {
                if (window.getSelection()?.toString()) {
                  return;
                }

                if (section === 'templates') {
                  let name = '';
                  let description = '';

                  checkProjectLimit();

                  showDialog({
                    disableEnforceFocus: true,
                    fullWidth: true,
                    maxWidth: 'sm',
                    title: t('newObject', { object: t('project') }),
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
                    cancelText: t('cancel'),
                    okText: t('create'),
                    okIcon: <RocketLaunchRoundedIcon />,
                    onOk: async () => {
                      try {
                        const project = await createProject({
                          blockletDid: item.blockletDid,
                          templateId: item.id,
                          name,
                          description,
                        });
                        currentGitStore.setState({
                          currentProjectId: project.id,
                        });
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
                } else if (section === 'projects') {
                  currentGitStore.setState({
                    currentProjectId: item.id,
                  });
                  navigate(joinURL('/projects', item.id!));
                } else if (section === 'examples') {
                  // if is multi-tenant
                  if (window.blocklet?.tenantMode === 'multiple') {
                    setMenuAnchor({
                      section,
                      // @ts-ignore
                      anchor: e.currentTarget.getElementsByClassName('action')?.[0] || e.currentTarget,
                      id: item.id!,
                      blockletDid: item.blockletDid,
                    });
                    return;
                  }

                  if (!item.duplicateFrom) {
                    try {
                      setLoading(item);
                      const project = await createProject({
                        blockletDid: item.blockletDid,
                        withDuplicateFrom: true,
                        templateId: item.id!,
                        name: item.name,
                        description: item.description,
                      });
                      currentGitStore.setState({
                        currentProjectId: project.id,
                      });
                      navigate(joinURL('/projects', project.id!));
                    } catch (error) {
                      const message = getErrorMessage(error);
                      if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
                        createLimitDialog();
                      } else {
                        Toast.error(message);
                      }

                      setLoading(null);
                    }
                  } else {
                    currentGitStore.setState({
                      currentProjectId: item.id,
                    });
                    navigate(joinURL('/projects', item.id!));
                  }
                }
              }}
              actions={
                section !== 'templates' && (
                  <IconButton
                    data-testid="projects-item-menu-button"
                    size="small"
                    sx={{
                      backgroundColor: 'transparent',
                      borderRadius: 1,
                      padding: 0,

                      '&:hover': {
                        backgroundColor: 'transparent',
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuAnchor({ section, anchor: e.currentTarget, id: item.id!, blockletDid: item.blockletDid });
                    }}>
                    <Box component={Icon} icon={DotsVerticalIcon} fontSize={20} />
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
  name,
  description,
  createdAt,
  actions,
  section,
  gitUrl,
  users,
  loading = false,
  didSpaceAutoSync,
  id,
  updatedAt,
  blockletDid,
  ...props
}: {
  section: string;
  pinned?: boolean;
  name?: string;
  description?: string;
  updatedAt: string | Date;
  createdAt?: string | Date;
  gitUrl?: string;
  users?: User[];
  actions?: ReactNode;
  loading: boolean;
  didSpaceAutoSync: true | false;
  id: string;
  blockletDid?: string;
} & StackProps) {
  const { t, locale } = useLocaleContext();
  const { session } = useSessionContext();
  const { data: spaceInfo } = useSpaceInfo(session?.user?.didSpace?.endpoint);

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

  const { value: projectDataUrlInSpace } = useAsync(async () => {
    if (spaceInfo?.spaceOwnerDid) {
      return await getProjectDataUrlInSpace(session?.user?.didSpace?.endpoint, id);
    }
    return '';
  }, [session?.user?.didSpace?.endpoint, id, spaceInfo?.spaceOwnerDid]);

  return (
    <ProjectItemRoot {...props} className={cx(props.className)} gap={2} data-testid="projects-item" data-id={id}>
      <Stack direction="row" gap={1.5} alignItems="center">
        <Box className="logo" sx={{ width: '72px', height: '72px' }}>
          <Box component="img" alt="" src={getProjectIconUrl(id, { blockletDid, updatedAt, working: true })} />
        </Box>

        <Box flex={1} width={0} alignSelf="flex-start">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={0.5} flex={1} width={0}>
              <Box className="name" sx={{ fontWeight: 600, fontSize: 18, lineHeight: '28px' }}>
                {name || t('unnamed')}
              </Box>

              {pinned && (
                <Tooltip title={t('pin')} placement="top">
                  <Box className="center" data-testid="projects-item-pin">
                    <Pin />
                  </Box>
                </Tooltip>
              )}
            </Box>

            <Box ml={1} width={24} className="center">
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
            {/* @ts-ignore */}
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
                  <Box component={Icon} icon={BrandGithubFilledIcon} fontSize={16} />
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

  @media (max-width: 900px) {
    .action {
      display: flex;
    }
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
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
`;

function ButtonPopper({ children, list, onClick }: { children: any; list?: any; onClick?: any }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (onClick) {
      onClick?.();
    }
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
      <Box ref={anchorRef}>{cloneElement(children, { onClick: handleToggle })}</Box>

      <Popper
        sx={{ zIndex: 1 }}
        open={open}
        anchorEl={anchorRef.current}
        transition
        disablePortal
        placement="bottom-end">
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>{list}</ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}
