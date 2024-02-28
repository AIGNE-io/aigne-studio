import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Typography } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useProjectState } from './state';

export default function ProjectBrand() {
  const { t } = useLocaleContext();

  const { projectId } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId');

  const {
    state: { project },
    refetch,
  } = useProjectState(projectId, currentGitStore.getState().defaultBranch);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!project) return null;

  return <Typography variant="h6">{project.name || t('unnamed')}</Typography>;
}
