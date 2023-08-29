import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ArrowBackIosNew, Menu, MenuOpen } from '@mui/icons-material';
import { Button, Drawer, IconButton, Toolbar, Typography } from '@mui/material';
import { ComponentProps, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import DatasetsButton from './datasets-button';
import NextButton from './next-button';
import SettingsButton from './settings-button';
import { FormState } from './state';
import TemplateList from './template-list';

export default function TemplateToolbar({
  projectId,
  formState,
  TemplateListProps,
}: {
  projectId: string;
  formState: FormState;
  TemplateListProps: Omit<ComponentProps<typeof TemplateList>, 'title'>;
}) {
  const { t } = useLocaleContext();

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Toolbar
      sx={{
        position: 'sticky',
        top: 0,
        gap: 2,
        bgcolor: 'background.paper',
        zIndex: (theme) => theme.zIndex.appBar,
      }}>
      <Button
        component={RouterLink}
        to="../.."
        sx={{ display: 'flex', alignItems: 'center' }}
        startIcon={<ArrowBackIosNew sx={{ mr: 0.5, fontSize: 18 }} />}>
        {t('form.project')}
      </Button>

      <Button startIcon={drawerOpen ? <MenuOpen /> : <Menu />} onClick={() => setDrawerOpen(!drawerOpen)}>
        Templates
      </Button>

      <Drawer
        keepMounted
        variant="temporary"
        PaperProps={{ sx: { width: '100%', maxWidth: 400 } }}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}>
        <TemplateList
          title={
            <>
              <IconButton color="primary" size="small" onClick={() => setDrawerOpen(false)}>
                <ArrowBackIosNew fontSize="small" />
              </IconButton>

              <Typography variant="subtitle1" sx={{ flex: 1, mx: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('main.templates')}
              </Typography>
            </>
          }
          {...TemplateListProps}
          onClick={(...args) => {
            setDrawerOpen(false);
            TemplateListProps.onClick(...args);
          }}
        />
      </Drawer>

      {formState.current.form && (
        <>
          <SettingsButton projectId={projectId} value={formState.current.form} onChange={formState.current.setForm} />

          <DatasetsButton value={formState.current.form} onChange={formState.current.setForm} />

          <NextButton projectId={projectId} value={formState.current.form} onChange={formState.current.setForm} />
        </>
      )}
    </Toolbar>
  );
}
