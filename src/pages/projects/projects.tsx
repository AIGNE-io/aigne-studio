import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Add, Delete, Edit, MoreVert } from '@mui/icons-material';
import {
  Box,
  Card,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  listItemIconClasses,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Project } from '../../../api/src/store/projects';
import Dropdown from '../../components/template-form/dropdown';
import { useProjectsState } from '../../contexts/projects';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';

export default function ProjectsPage() {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  const {
    state: { loading, projects },
    refetch,
    createProject,
    deleteProject,
    updateProject,
  } = useProjectsState();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    refetch();
    setInitialized(true);
  }, []);

  const onCreate = () => {
    let name = '';

    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: `${t('form.new')} ${t('form.project')}`,
      content: (
        <Box sx={{ maxWidth: 300 }}>
          <TextField
            autoFocus
            fullWidth
            label={t('form.name')}
            defaultValue={name}
            onChange={(e) => (name = e.target.value)}
          />
        </Box>
      ),
      okText: t('form.new'),
      cancelText: t('alert.cancel'),
      onOk: async () => {
        try {
          await createProject({ name: name.trim() || null });
        } catch (error) {
          Toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  const onDelete = (project: Project) => {
    showDialog({
      maxWidth: 'sm',
      fullWidth: true,
      content: (
        <Typography variant="h6">{t('alert.deleteProject', { project: project.name || project._id })}</Typography>
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

  const onEdit = (project: Project) => {
    let { name } = project;

    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: `${t('alert.edit')} ${t('form.project')}`,
      content: (
        <Box sx={{ maxWidth: 300 }}>
          <TextField
            autoFocus
            fullWidth
            label={t('form.name')}
            defaultValue={name}
            onChange={(e) => (name = e.target.value)}
          />
        </Box>
      ),
      okText: t('form.save'),
      cancelText: t('alert.cancel'),
      onOk: async () => {
        try {
          await updateProject(project._id!, { name: name?.trim() || null });
        } catch (error) {
          Toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  return (
    <Box>
      <Grid container spacing={2} p={2}>
        {projects.map((item) => (
          <Grid key={item._id} item xs={4}>
            <Box component={Link} to={item._id!} sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
                  position: 'relative',
                  p: 2,
                  border: 1,
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                  borderRadius: 2,
                  ':hover': {
                    boxShadow: 1,
                  },
                }}>
                <Typography>{item.name || t('alert.unnamed')}</Typography>

                <Box sx={{ position: 'absolute', right: 8, top: 8 }} onClick={(e) => e.preventDefault()}>
                  <Dropdown
                    placement="bottom-end"
                    dropdown={
                      <List
                        disablePadding
                        sx={{
                          [`.${listItemIconClasses.root}`]: {
                            minWidth: 32,
                          },
                        }}>
                        <ListItemButton onClick={() => onEdit(item)}>
                          <ListItemIcon>
                            <Edit />
                          </ListItemIcon>
                          <ListItemText primary={t('alert.edit')} />
                        </ListItemButton>
                        <Divider sx={{ my: 0.5 }} />
                        <ListItemButton sx={{ color: 'warning.main' }} onClick={() => onDelete(item)}>
                          <ListItemIcon>
                            <Delete color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={t('alert.delete')} />
                        </ListItemButton>
                      </List>
                    }>
                    <IconButton>
                      <MoreVert />
                    </IconButton>
                  </Dropdown>
                </Box>

                <Box sx={{ height: '2em' }} />
              </Card>
            </Box>
          </Grid>
        ))}
        {(projects.length > 0 || !loading) && initialized && (
          <Grid item xs={4}>
            <Card
              elevation={0}
              sx={{
                p: 2,
                border: 1,
                borderColor: 'grey.200',
                cursor: 'pointer',
                bgcolor: 'grey.100',
                borderRadius: 2,
                ':hover': {
                  boxShadow: 1,
                },
              }}
              onClick={onCreate}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ mr: 1 }}>
                  <Add sx={{ display: 'block', verticalAlign: 'baseline' }} />
                </Box>
                <Typography variant="button" noWrap sx={{ flex: 1, overflow: 'hidden' }}>
                  {`${t('form.new')} ${t('form.project')}`}
                </Typography>
              </Box>
              <Box sx={{ height: '2em' }} />
            </Card>
          </Grid>
        )}

        {loading && (
          <Grid item xs={12} textAlign="center">
            <CircularProgress size={20} />
          </Grid>
        )}
      </Grid>

      {dialog}
    </Box>
  );
}
