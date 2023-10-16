import { Box } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { defaultBranch, useProjectState } from './state';

export default function ProjectLogo() {
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

  return <Box component="img" src={project.icon || blocklet?.appLogo} sx={{ borderRadius: 1 }} />;
}
