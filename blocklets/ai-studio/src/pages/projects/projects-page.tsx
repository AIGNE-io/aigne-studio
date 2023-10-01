import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';

import { useProjectsState } from '../../contexts/projects';
import Projects from './projects';

export default function ProjectsPage() {
  const { refetch } = useProjectsState();

  useEffect(() => {
    refetch();
  }, []);

  return <Projects />;
}

export function FooterInfo() {
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
        borderTop: 1,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTopColor: (theme) => theme.palette.divider,
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
