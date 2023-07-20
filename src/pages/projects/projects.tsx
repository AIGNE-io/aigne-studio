import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Add } from '@mui/icons-material';
import { Box, Card, CircularProgress, Grid, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
  } = useProjectsState();

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    refetch();
    setInitialized(true);
  }, []);

  return (
    <Box>
      <Grid container spacing={2} p={2}>
        {projects.map((item) => (
          <Grid key={item._id} item xs={4}>
            <Box component={Link} to={item._id!} sx={{ textDecoration: 'none' }}>
              <Card
                elevation={0}
                sx={{
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
              onClick={() => {
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
                  onOk: async () => {
                    try {
                      await createProject({ name: name.trim() || null });
                    } catch (error) {
                      Toast.error(getErrorMessage(error));
                      throw error;
                    }
                  },
                });
              }}>
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
