import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { getProjectIconUrl } from '../../libs/project';
import BranchButton from './branch-button';
import { useProjectState } from './state';

export default function ProjectBrand() {
  const { t } = useLocaleContext();

  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId');

  const {
    state: { project },
    refetch,
  } = useProjectState(projectId, getDefaultBranch());

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!project) return null;

  const simpleMode = !project || project?.gitType === 'simple';

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Stack flexDirection="row" alignItems="center" gap={1}>
        <Box
          component="img"
          src={project.icon || getProjectIconUrl(projectId, project.updatedAt) || blocklet?.appLogo}
          sx={{ borderRadius: 1, maxWidth: 32, maxHeight: 32 }}
        />
        <Typography variant="h6">{project.name || t('unnamed')}</Typography>
      </Stack>

      {!simpleMode && gitRef && <BranchButton projectId={projectId} gitRef={gitRef} filepath={filepath} />}
    </Box>
  );
}
