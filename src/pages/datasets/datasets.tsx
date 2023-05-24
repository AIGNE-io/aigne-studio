import Toast from '@arcblock/ux/lib/Toast';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { Add } from '@mui/icons-material';
import { Box, Card, Grid, TextField, Typography } from '@mui/material';
import { useEffect } from 'react';

import { useDatasets } from '../../contexts/datasets';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';

export default function DatasetsPage() {
  const { dialog, showDialog } = useDialog();

  const { datasets, refetch, createDataset } = useDatasets();

  useEffect(() => {
    refetch();
  }, []);

  return (
    <Root footerProps={{ className: 'dashboard-footer' }}>
      <Grid container spacing={2} p={2}>
        {datasets.map((item) => (
          <Grid key={item._id} item xs={4}>
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
              <Typography>{item.name || 'Unnamed'}</Typography>

              <Box sx={{ height: '2em' }} />
            </Card>
          </Grid>
        ))}
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
                title: 'Create Dataset',
                content: (
                  <Box sx={{ maxWidth: 300 }}>
                    <TextField
                      autoFocus
                      fullWidth
                      label="Name"
                      defaultValue={name}
                      onChange={(e) => (name = e.target.value)}
                    />
                  </Box>
                ),
                onOk: async () => {
                  try {
                    await createDataset({ name: name.trim() || null });
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
                Create Dataset
              </Typography>
            </Box>
            <Box sx={{ height: '2em' }} />
          </Card>
        </Grid>
      </Grid>

      {dialog}
    </Root>
  );
}

const Root = styled(Dashboard)`
  > .dashboard-body > .dashboard-main {
    > .dashboard-content {
      overflow: auto;
      padding: 0;
    }

    > .dashboard-footer {
      margin-top: 0;
      padding: 0;
    }
  }
`;
