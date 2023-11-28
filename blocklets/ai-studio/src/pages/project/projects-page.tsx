import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Tag from '@arcblock/ux/lib/Tag';
import Toast from '@arcblock/ux/lib/Toast';
import { cx } from '@emotion/css';
import ForkRightSharpIcon from '@mui/icons-material/ForkRightSharp';
import GitHubIcon from '@mui/icons-material/GitHub';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Avatar,
  AvatarGroup,
  Box,
  CircularProgress,
  ClickAwayListener,
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
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { useKeyPress, useSize } from 'ahooks';
import { MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';

import { Project } from '../../../api/src/store/projects';
import DeleteDialog from '../../components/delete-confirm/dialog';
import { useProjectsState } from '../../contexts/projects';
import { useReadOnly } from '../../contexts/session';
import { getErrorMessage } from '../../libs/api';
import { createProject } from '../../libs/project';
import Add from './icons/add';
import Duplicate from './icons/duplicate';
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

type NewProject = Project & {
  users: User[];
  branches: string[];
  templateCounts: number;
};

export default function ProjectsPage() {
  const {
    state: { loading, templates, projects, selected },
    refetch,
  } = useProjectsState();
  const navigate = useNavigate();
  const ref = useRef(null);
  const size = useSize(ref);

  useEffect(() => {
    refetch();
  }, []);

  useKeyPress(['leftarrow', 'uparrow'], () => {
    const list = [...document.getElementsByClassName('project-item')];
    const current = list.findIndex((i) => i.id === selected?.id);
    const next = list[current - 1] ?? list.at(-1);
    if (next) (next as HTMLElement).focus();
  });

  useKeyPress(['rightarrow', 'downarrow'], () => {
    const list = [...document.getElementsByClassName('project-item')];
    const current = list.findIndex((i) => i.id === selected?.id);
    const next = list[current + 1] ?? list[0];
    if (next) (next as HTMLElement).focus();
  });

  useKeyPress('enter', () => {
    const activeProjectItem = document.activeElement && document.activeElement.classList.contains('project-item');

    if (selected && activeProjectItem) {
      navigate(joinUrl('/projects', selected.id));
    }
  });

  const maxWidth = useMemo(() => {
    const maxItemWidth = 350;
    if (!size?.width) {
      return maxItemWidth;
    }

    const screenWidth = size?.width > 24 * 2 ? (size?.width || 0) - 24 * 2 : size?.width;
    const marginWidth = 16;

    const itemsPerRow = Math.ceil((screenWidth + marginWidth) / (maxItemWidth + marginWidth));
    const actualItemWidth = itemsPerRow === 1 ? Math.min(screenWidth, maxItemWidth) : screenWidth / itemsPerRow;

    return actualItemWidth - marginWidth + Math.floor(marginWidth / itemsPerRow);
  }, [size]);

  return (
    <Stack minHeight="100%" overflow="auto" ref={ref}>
      <Box m={{ xs: 2, sm: 3 }} flexGrow={1}>
        <ProjectMenu />

        {loading ? (
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <ProjectItemSkeleton width={{ sm: 'calc(50% - 18px)', md: 350 }} maxWidth={350} height={178} />
            <ProjectItemSkeleton width={{ sm: 'calc(50% - 18px)', md: 350 }} maxWidth={350} height={178} />
          </Stack>
        ) : (
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {!!templates.length && (
              <ProjectList section="templates" list={templates as NewProject[]} maxWidth={maxWidth} />
            )}
            {projects.length ? (
              <ProjectList section="projects" list={projects as NewProject[]} maxWidth={maxWidth} />
            ) : null}
          </Stack>
        )}
      </Box>

      <ProjectsFooter />
    </Stack>
  );
}

function ProjectMenu() {
  const { projectId } = useParams();

  const navigate = useNavigate();
  const [deleteItem, setDeleteItem] = useState<null | Project>();

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
    </>
  );
}

function ProjectList({
  section,
  list,
  maxWidth,
}:
  | { section: 'templates'; list: NewProject[]; maxWidth: number }
  | { section: 'projects'; list: NewProject[]; maxWidth: number }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const {
    state: { selected, menuAnchor },
    setSelected,
    setMenuAnchor,
  } = useProjectsState();

  return (
    <>
      {list.map((item) => {
        const menuOpen = menuAnchor?.section === section && menuAnchor?.id === item._id;

        return (
          <ProjectItem
            section={section}
            className="project-item"
            id={item._id!}
            tabIndex={0}
            key={item._id}
            pinned={!!item.pinnedAt}
            icon={item.icon}
            width={{ sm: 'calc(50% - 16px)', md: '100%' }}
            maxWidth={`${maxWidth}px`}
            minWidth="300px"
            selected={selected?.section === section && selected.id === item._id}
            name={section === 'templates' && item.name ? t(item.name) : item.name}
            description={item.description}
            updatedAt={item.updatedAt}
            createdAt={item.createdAt}
            templateCounts={item.templateCounts}
            branches={item.branches || []}
            gitUrl={item.gitUrl}
            model={item.model}
            users={item.users || []}
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={async () => {
              if (section === 'templates') {
                try {
                  const project = await createProject({ templateId: item._id! });
                  navigate(joinUrl('/projects', project._id!));
                } catch (error) {
                  Toast.error(getErrorMessage(error));
                  throw error;
                }
              } else if (section === 'projects') {
                navigate(joinUrl('/projects', item._id!));
              }
            }}
            onFocus={() => setSelected({ section, id: item._id! })}
            actions={
              section === 'projects' && (
                <IconButton
                  className={cx(!menuOpen && 'hover-visible')}
                  size="small"
                  sx={{
                    backgroundColor: (theme) => theme.palette.background.paper,
                    color: (theme) => theme.palette.text.disabled,
                    borderRadius: 1,

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
        <Skeleton variant="rectangular" width={80} height={80} />

        <Stack width={0} flex={1}>
          <Skeleton width="100%" variant="text" height={28} />
          <Skeleton width="100%" variant="text" height={28} />
        </Stack>
      </Stack>

      <Stack direction="row" gap={1} mt={1} alignItems="center">
        <Skeleton width="40px" variant="text" height={28} />
        <Skeleton width="40px" variant="text" height={28} />
        <Skeleton width="40px" variant="text" height={28} />
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
  selected,
  actions,
  mainActions,
  section,
  templateCounts,
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
  selected?: boolean;
  templateCounts: number;
  branches: string[];
  gitUrl?: string;
  model?: string;
  users?: User[];
  actions?: ReactNode;
  mainActions?: ReactNode;
} & StackProps) {
  const { t } = useLocaleContext();

  if (section === 'templates') {
    return (
      <ProjectItemRoot
        {...props}
        className={cx(props.className, selected && 'selected')}
        minHeight={178}
        justifyContent="center"
        alignItems="center">
        <Add sx={{ fontSize: 40, color: (theme) => theme.palette.text.disabled }} />
      </ProjectItemRoot>
    );
  }

  return (
    <ProjectItemRoot {...props} className={cx(props.className, selected && 'selected')}>
      <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between" mb={2}>
        <Tag type="primary">{model}</Tag>

        <Stack direction="row" gap={1} alignItems="center" sx={{ color: (theme) => theme.palette.text.disabled }}>
          {createdAt && (
            <Box sx={{ fontSize: 12 }}>
              <RelativeTime value={createdAt} />
            </Box>
          )}

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
      </Stack>

      <Stack direction="row" gap={2}>
        <Stack alignItems="center" justifyContent="center" className="logo" sx={{ width: '80px', height: '80px' }}>
          {icon ? <Box component="img" src={icon} /> : <Picture sx={{ color: 'grey.400', fontSize: 56 }} />}
        </Stack>

        <Stack width={0} flex={1}>
          <Box className="name" sx={{ fontSize: 16, fontWeight: 500 }}>
            {name || t('unnamed')}
          </Box>

          <Box className="desc" sx={{ fontSize: 14, color: (theme) => theme.palette.text.secondary }}>
            {description}
          </Box>
        </Stack>
      </Stack>

      <Stack direction="row" gap={2} mt={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" gap={2} sx={{ fontSize: '12px', color: (theme) => theme.palette.text.disabled }}>
          <Box>{`${templateCounts} 条模板`}</Box>

          <Tooltip title={branches.length > 1 ? branches.join('、') : ''} placement="top">
            <Stack direction="row" alignItems="center">
              <ForkRightSharpIcon sx={{ fontSize: 14 }} />
              <Box>{`${branches[0]}`}</Box>
            </Stack>
          </Tooltip>

          {!!gitUrl && (
            <Box display="flex" alignItems="center">
              <Tooltip title={gitUrl} placement="top">
                <GitHubIcon sx={{ fontSize: 14 }} />
              </Tooltip>
            </Box>
          )}
        </Stack>

        <Box mr={-0.5}>
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

function ProjectsFooter() {
  const { t, locale } = useLocaleContext();

  const {
    state: { selected, templates, projects },
  } = useProjectsState();
  if (!selected) return null;

  const item = templates.find((i) => i._id === selected.id) ?? projects.find((i) => i._id === selected.id);
  if (!item) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.paper',
        zIndex: (theme) => theme.zIndex.appBar,
        borderTopWidth: 1,
        borderTopStyle: 'solid',
        borderTopColor: (theme) => theme.palette.grey[200],
        px: { xs: 2, sm: 3 },
        py: 2,
      }}>
      <Stack direction="row" gap={1}>
        <Box>
          {item.icon ? (
            <Box
              component="img"
              src={item.icon}
              width={80}
              height={80}
              borderRadius={1}
              sx={{ objectFit: 'contain' }}
            />
          ) : (
            <Picture sx={{ fontSize: 56, color: 'grey.400' }} />
          )}
        </Box>

        <Stack flex={1}>
          <Typography variant="h6">
            {(selected.section === 'projects' ? item.name : item.name && t(item.name)) || t('unnamed')}
          </Typography>
          <Typography variant="body1">{item.description}</Typography>
          <Typography variant="caption">
            {t('createdAt')} <RelativeTime value={item.createdAt} locale={locale} />
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
