import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { LoadingButton } from '@blocklet/studio-ui';
import { cx } from '@emotion/css';
import {
  Box,
  Button,
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
  Stack,
  StackProps,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { MouseEvent, ReactNode, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';

import { Project } from '../../../api/src/store/projects';
import Loading from '../../components/loading';
import { useProjectsState } from '../../contexts/projects';
import { getErrorMessage } from '../../libs/api';
import { createProject } from '../../libs/project';
import useDialog from '../../utils/use-dialog';
import Add from './icons/add';
import ChevronDown from './icons/chevron-down';
import Duplicate from './icons/duplicate';
import External from './icons/external';
import MenuVertical from './icons/menu-vertical';
import Picture from './icons/picture';
import Pin from './icons/pin';
import PinOff from './icons/pin-off';
import Trash from './icons/trash';
import WarningCircle from './icons/warning-circle';

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
    <Stack minHeight="100%">
      <Box mx={{ xs: 2, sm: 3 }} flexGrow={1}>
        <ProjectMenu />

        {templates.length > 0 && (
          <Section enableCollapse title={t('newFromTemplates')}>
            <ProjectList section="templates" list={templates} />
          </Section>
        )}

        {projects.length ? (
          <Section title={t('myProjects')}>
            <ProjectList section="projects" list={projects} />
          </Section>
        ) : (
          loading && <Loading fixed />
        )}
      </Box>

      <ProjectsFooter />
    </Stack>
  );
}

function ProjectMenu() {
  const { projectId } = useParams();

  const navigate = useNavigate();

  const { t } = useLocaleContext();

  const { dialog, showDialog } = useDialog();

  const {
    state: { menuAnchor },
    createProject,
    deleteProject,
    updateProject,
    setMenuAnchor,
  } = useProjectsState();

  const onDelete = (project: Project) => {
    showDialog({
      maxWidth: 'sm',
      fullWidth: true,
      content: (
        <Stack direction="row">
          <WarningCircle color="warning" fontSize="large" sx={{ verticalAlign: 'text-bottom', mr: 2 }} />

          <Stack flex={1}>
            <Typography my={0.5} variant="h6" whiteSpace="pre-wrap">
              {t('deleteProjectTitle', { project: project.name || t('unnamed') })}
            </Typography>

            <Typography my={2} variant="body2" whiteSpace="pre-wrap">
              {t('deleteProjectTips')}
            </Typography>
          </Stack>
        </Stack>
      ),
      okColor: 'warning',
      okText: t('alert.delete'),
      okIcon: <Trash />,
      cancelText: t('alert.cancel'),
      onOk: async () => {
        try {
          await deleteProject(project._id!);
          if (projectId === project._id) {
            navigate('/projects', { replace: true });
          }
        } catch (error) {
          Toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  return (
    <>
      {dialog}

      <Popper
        key={menuAnchor?.item._id}
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor?.anchor}
        placement="right-start">
        <ClickAwayListener onClickAway={() => setMenuAnchor(undefined)}>
          <Paper>
            <List dense>
              <LoadingMenuItem
                onClick={() =>
                  createProject({ duplicateFrom: menuAnchor!.item._id! })
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
                  onClick={() =>
                    updateProject(menuAnchor.item._id!, { pinned: !menuAnchor.item.pinnedAt })
                      .catch((error) => {
                        Toast.error(getErrorMessage(error));
                        throw error;
                      })
                      .finally(() => {
                        setMenuAnchor(undefined);
                      })
                  }>
                  <ListItemIcon>{menuAnchor.item.pinnedAt ? <PinOff /> : <Pin />}</ListItemIcon>
                  {menuAnchor.item.pinnedAt ? t('unpin') : t('pin')}
                </LoadingMenuItem>
              )}

              <Divider />

              <MenuItem
                sx={{ color: 'warning.main' }}
                onClick={() => {
                  onDelete(menuAnchor!.item);
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
          top: 64,
          bgcolor: 'background.paper',
          zIndex: 1,
          cursor: enableCollapse ? 'pointer' : 'default',
          my: 1,
          alignItems: 'center',
          gap: 1,
        }}
        onClick={() => setTemplatesVisible(!templatesVisible)}>
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>

        {enableCollapse && (
          <IconButton size="small">
            <ChevronDown
              sx={{
                transform: `rotateZ(${templatesVisible ? '-180deg' : '0deg'})`,
                transition: (theme) => theme.transitions.create('all'),
              }}
            />
          </IconButton>
        )}
      </Stack>

      <Collapse in={enableCollapse ? templatesVisible : true} sx={{ py: 0.5, position: 'relative' }}>
        {children}
      </Collapse>
    </Box>
  );
}

function ProjectList({
  section,
  list,
}: { section: 'templates'; list: Project[] } | { section: 'projects'; list: Project[] }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const {
    state: { selected, menuAnchor },
    setSelected,
    setMenuAnchor,
  } = useProjectsState();

  return (
    <Stack direction="row" flexWrap="wrap" gap={{ xs: 2, sm: 3 }}>
      {list.map((item) => {
        const menuOpen = menuAnchor?.section === section && menuAnchor?.item._id === item._id;

        return (
          <ProjectItem
            key={item._id}
            pinned={!!item.pinnedAt}
            icon={item.icon}
            width={{ xs: 'calc(50% - 8px)', sm: 'calc(25% - 18px)', md: 180 }}
            maxWidth={180}
            selected={selected?.section === section && selected.item._id === item._id}
            name={section === 'templates' && item.name ? t(item.name) : item.name}
            onClick={() => setSelected({ section, item })}
            mainActions={
              item._id &&
              (section === 'projects' ? (
                <Button
                  component={RouterLink}
                  to={joinUrl('/projects', item._id)}
                  className="hover-visible"
                  size="small"
                  variant="contained"
                  startIcon={<External />}>
                  {t('open')}
                </Button>
              ) : section === 'templates' ? (
                <LoadingButton
                  className="hover-visible"
                  size="small"
                  variant="contained"
                  startIcon={<Add />}
                  loadingPosition="start"
                  onClick={async () => {
                    try {
                      const project = await createProject({ templateId: item._id! });
                      navigate(joinUrl('/projects', project._id!));
                    } catch (error) {
                      Toast.error(getErrorMessage(error));
                      throw error;
                    }
                  }}>
                  {t('create')}
                </LoadingButton>
              ) : null)
            }
            actions={
              section === 'projects' && (
                <IconButton
                  className={cx(!menuOpen && 'hover-visible')}
                  size="small"
                  sx={menuOpen ? { bgcolor: 'grey.100' } : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuAnchor({ section, anchor: e.currentTarget, item });
                  }}>
                  <MenuVertical fontSize="small" />
                </IconButton>
              )
            }
          />
        );
      })}
    </Stack>
  );
}

function ProjectItem({
  pinned,
  icon,
  name,
  selected,
  actions,
  mainActions,
  ...props
}: {
  pinned?: boolean;
  icon?: string;
  name?: string;
  selected?: boolean;
  actions?: ReactNode;
  mainActions?: ReactNode;
} & StackProps) {
  const { t } = useLocaleContext();

  return (
    <ProjectItemRoot {...props} alignItems="center" className={cx(props.className, selected && 'selected')}>
      <Box className="logo">
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
          {icon ? <Box component="img" src={icon} /> : <Picture sx={{ color: 'grey.400', fontSize: 56 }} />}
        </Stack>

        {(actions || mainActions) && (
          <Stack direction="row" sx={{ position: 'absolute', right: 0, bottom: 0, p: 1, gap: 1, alignItems: 'center' }}>
            {mainActions}

            {actions}
          </Stack>
        )}

        {pinned && (
          <Tooltip title={t('pin')} placement="top">
            <Pin
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: 'grey.500',
                fontSize: 16,
              }}
            />
          </Tooltip>
        )}
      </Box>

      <Typography className="name" variant="subtitle1" noWrap>
        {name || t('unnamed')}
      </Typography>
    </ProjectItemRoot>
  );
}

const ProjectItemRoot = styled(Stack)`
  width: 100%;
  min-width: 140px;
  cursor: pointer;

  .logo {
    position: relative;
    border-width: 1px;
    border-style: solid;
    border-color: ${({ theme }) => theme.palette.divider};
    border-radius: ${({ theme }) => theme.shape.borderRadius * 2}px;
    width: 100%;
    overflow: hidden;

    &:before {
      content: '';
      display: block;
      padding-bottom: 100%;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: ${({ theme }) => theme.shape.borderRadius * 2}px;
    }
  }

  .name {
    width: 100%;
    min-height: 1.75em;
    margin: 4px 0;
    text-align: center;
  }

  .hover-visible {
    display: none;
  }

  :hover {
    .name {
      color: ${({ theme }) => theme.palette.primary.main};
    }

    .logo {
      border-color: ${({ theme }) => theme.palette.primary.main};
    }

    .hover-visible {
      display: flex;
    }
  }

  &.selected {
    .name {
      color: ${({ theme }) => theme.palette.primary.dark};
      font-weight: bold;
    }

    .logo {
      border-color: transparent;
      outline-style: solid;
      outline-width: 2;
      outline-color: ${({ theme }) => theme.palette.primary.dark};
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

function ProjectsFooter() {
  const { t, locale } = useLocaleContext();

  const {
    state: { selected },
  } = useProjectsState();

  if (!selected) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        bgcolor: 'background.paper',
        zIndex: (theme) => theme.zIndex.appBar,
        borderTopWidth: 1,
        borderTopStyle: 'dashed',
        borderTopColor: (theme) => theme.palette.grey[200],
        px: { xs: 2, sm: 3 },
        py: 2,
      }}>
      <Typography variant="h6">
        {(selected.section === 'templates' && selected.item.name && t(selected.item.name)) || t('unnamed')}
      </Typography>
      <Typography variant="body1">{selected.item.description}</Typography>
      <Typography variant="caption">
        {t('createdAt')} <RelativeTime value={selected.item.createdAt} locale={locale} />
      </Typography>
    </Box>
  );
}
