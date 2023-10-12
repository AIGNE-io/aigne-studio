import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

import { defaultBranch, useProjectState } from './state';

export default function ProjectBrand() {
  const { t } = useLocaleContext();

  const { projectId } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId');

  const {
    state: { project },
  } = useProjectState(projectId, defaultBranch);

  if (!project) return null;

  return <Typography variant="h6">{project.name || t('unnamed')}</Typography>;
}
