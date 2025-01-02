import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { BoxProps, TypographyProps } from '@mui/material';
import { Box, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { getProjectIconUrl } from '../../libs/project';
import BranchButton from './branch-button';
import { useProjectState } from './state';
import { useProjectStore } from './yjs-state';

export default function ProjectBrand() {
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
      {gitRef && (
        <Stack flexDirection="row" alignItems="center" gap={1}>
          <ProjectIcon
            projectId={projectId}
            projectRef={gitRef}
            working
            sx={{ borderRadius: 1, maxWidth: 32, maxHeight: 32 }}
          />
          <ProjectName
            projectId={projectId}
            projectRef={gitRef}
            working
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          />
        </Stack>
      )}

      {!simpleMode && gitRef && <BranchButton projectId={projectId} gitRef={gitRef} filepath={filepath} />}
    </Box>
  );
}

function ProjectIcon({
  projectId,
  projectRef,
  working,
  ...props
}: { projectId: string; projectRef: string; working?: boolean } & BoxProps) {
  const { projectSetting } = useProjectStore(projectId, projectRef);

  return (
    <Box
      component="img"
      alt=""
      src={getProjectIconUrl(projectId, {
        projectRef,
        updatedAt: projectSetting?.iconVersion,
        working,
      })}
      {...props}
    />
  );
}

function ProjectName({
  projectId,
  projectRef,
  working,
  ...props
}: { projectId: string; projectRef: string; working?: boolean } & TypographyProps) {
  const { t } = useLocaleContext();
  const { projectSetting } = useProjectStore(projectId, projectRef);

  return (
    <Typography variant="h6" {...props}>
      {projectSetting?.name || t('unnamed')}
    </Typography>
  );
}
