import { getDefaultBranch } from '@app/store/current-git-store';
import { Box } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { getProjectIconUrl } from '../../libs/project';
import { useProjectState } from './state';

export default function ProjectLogo() {
  const { projectId } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId');

  const {
    state: { project },
    refetch,
  } = useProjectState(projectId, getDefaultBranch());

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!project) return null;

  return (
    <Box
      component="img"
      src={project.icon || getProjectIconUrl(projectId) || blocklet?.appLogo}
      sx={{ borderRadius: 1 }}
    />
  );
}
