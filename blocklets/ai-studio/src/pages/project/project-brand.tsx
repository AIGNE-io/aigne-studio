import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Typography } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { defaultBranch, useProjectState } from './state';

export default function ProjectBrand() {
  const { t } = useLocaleContext();

  const { projectId } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId');

  const {
    state: { project },
    refetch,
  } = useProjectState(projectId, defaultBranch);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!project) return null;

  return <Typography variant="h6">{project.name || t('unnamed')}</Typography>;
}
