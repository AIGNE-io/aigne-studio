import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { Dashboard, LoadingButton } from '@blocklet/studio-ui';
import { cx } from '@emotion/css';
import {
  Add,
  ContentCopyOutlined,
  DeleteOutline,
  ExpandMore,
  InsertPhotoOutlined,
  LaunchOutlined,
  MoreHoriz,
  PushPinOutlined,
  WarningRounded,
} from '@mui/icons-material';
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { Project } from '../../../api/src/store/projects';
import Loading from '../../components/loading';
import { useProjectsState } from '../../contexts/projects';
import { getErrorMessage } from '../../libs/api';
import { createProject } from '../../libs/project';
import useDialog from '../../utils/use-dialog';

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
    <Dashboard ContentProps={{ sx: { px: { xs: 2, sm: 3 } } }} footer={<FooterInfo />}>
      <ProjectMenu />

      <Box maxWidth="xl" mx="auto" width="100%">
        {templates.length > 0 && (
          <Section enableCollapse title={t('newFromTemplates')}>
            <ProjectList section="templates" list={templates} />
          </Section>
        )}

        {projects.length > 0 ? (
          <Section title={t('myProjects')}>
            <ProjectList section="projects" list={projects} />
          </Section>
        ) : (
          loading && <Loading fixed />
        )}
      </Box>
    </Dashboard>
  );
}

function FooterInfo() {
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
        borderTop: 1,
        borderTopColor: (theme) => theme.palette.divider,
        px: { xs: 2, sm: 3 },
        py: 2,
      }}>
      <Box maxWidth="xl" mx="auto">
        <Typography variant="h6">
          {(selected.section === 'templates' && selected.item.name && t(selected.item.name)) || t('unnamed')}
        </Typography>
        <Typography variant="body1">{selected.item.description}</Typography>
        <Typography variant="caption">
          {t('createdAt')} <RelativeTime value={selected.item.createdAt} locale={locale} />
        </Typography>
      </Box>
    </Box>
  );
}

function ProjectMenu() {
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
      title: t('delete'),
      content: (
        <Stack direction="row">
          <WarningRounded color="warning" fontSize="large" sx={{ verticalAlign: 'text-bottom', mr: 2 }} />

          <Typography flex={1} whiteSpace="pre-wrap">
            {t('deleteProject', { project: project.name || project._id })}
          </Typography>
        </Stack>
      ),
      okColor: 'warning',
      okText: t('alert.delete'),
      cancelText: t('alert.cancel'),
      onOk: async () => {
        try {
          await deleteProject(project._id!);
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
                  <ContentCopyOutlined />
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
                  <ListItemIcon>
                    <PushPinOutlined />
                  </ListItemIcon>
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
                  <DeleteOutline color="inherit" />
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
    <>
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ cursor: enableCollapse ? 'pointer' : 'default' }}
        mt={{ xs: 2, sm: 3 }}
        mb={{ xs: 1, sm: 2 }}
        onClick={() => setTemplatesVisible(!templatesVisible)}>
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>

        {enableCollapse && (
          <IconButton size="small">
            <ExpandMore
              sx={{
                transform: `rotateZ(${templatesVisible ? '-180deg' : '0deg'})`,
                transition: (theme) => theme.transitions.create('all'),
              }}
            />
          </IconButton>
        )}
      </Stack>

      <Collapse in={enableCollapse ? templatesVisible : true} sx={{ py: 0.5 }}>
        {children}
      </Collapse>
    </>
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
            width={{ xs: 'calc(33.33% - 12px)', sm: 'calc(25% - 18px)', md: 160 }}
            maxWidth={{ xs: '100%', md: 160 }}
            selected={selected?.section === section && selected.item._id === item._id}
            name={section === 'templates' && item.name ? t(item.name) : item.name}
            onClick={() => setSelected({ section, item })}
            mainActions={
              item._id &&
              (section === 'projects' ? (
                <Button
                  component={RouterLink}
                  to={item._id}
                  className="hover-visible"
                  size="small"
                  variant="contained"
                  startIcon={<LaunchOutlined />}>
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
                      navigate(project._id!);
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
                  <MoreHoriz fontSize="small" />
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
  image,
  name,
  selected,
  actions,
  mainActions,
  ...props
}: {
  pinned?: boolean;
  image?: string;
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
          <InsertPhotoOutlined sx={{ color: 'grey.400', fontSize: 56 }} />
        </Stack>

        {mainActions && (
          <Stack
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              p: 1,
              gap: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {mainActions}
          </Stack>
        )}

        {actions && (
          <Stack direction="row" sx={{ position: 'absolute', right: 0, bottom: 0, p: 1, gap: 1, alignItems: 'center' }}>
            {actions}
          </Stack>
        )}

        {pinned && (
          <Tooltip title={t('pin')} placement="top">
            <PushPinOutlined
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                transform: 'rotateZ(45deg)',
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
  max-width: 160px;
  cursor: pointer;

  .logo {
    position: relative;
    border-width: 1px;
    border-style: solid;
    border-color: ${({ theme }) => theme.palette.divider};
    border-radius: 16px;
    width: 100%;

    &:before {
      content: '';
      display: block;
      padding-bottom: 100%;
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
