import LoadingButton from '@app/components/loading/loading-button';
import { useCurrentProject } from '@app/contexts/project';
import { AI_STUDIO_COMPONENT_DID } from '@app/libs/constants';
import { getProjectIconUrl } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { BlockletStudio } from '@blocklet/ui-react';
import { Icon } from '@iconify-icon/react';
import BrandAppgalleryIcon from '@iconify-icons/tabler/brand-appgallery';
import { LoadingButtonProps } from '@mui/lab';
import { Box, Tooltip } from '@mui/material';
import { Suspense, useState } from 'react';

import { saveButtonState, useProjectState } from '../state';

export default function PublishButton({ ...props }: LoadingButtonProps) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();
  const {
    state: { project },
  } = useProjectState(projectId, projectRef);

  const [showCreateResource, setShowCreateResource] = useState(false);

  return (
    <>
      <Tooltip disableInteractive title={t('publish')}>
        <LoadingButton
          variant="outlined"
          sx={{ minWidth: 0, minHeight: 0, height: 32, border: '1px solid #E5E7EB' }}
          onClick={async (e) => {
            e.stopPropagation();
            await saveButtonState.getState().save?.({ skipConfirm: true });
            setShowCreateResource(true);
          }}
          startIcon={<Box component={Icon} icon={BrandAppgalleryIcon} />}
          {...props}>
          {props.children || t('publish')}
        </LoadingButton>
      </Tooltip>

      {project && showCreateResource && <PublishDialog onClose={() => setShowCreateResource(false)} />}
    </>
  );
}

function PublishDialog({ onClose }: { onClose: () => void }) {
  const { projectId, projectRef } = useCurrentProject();
  const {
    state: { project },
  } = useProjectState(projectId, projectRef);

  const [opened, setOpened] = useState(false);

  if (!project) return null;

  return (
    <Suspense>
      <BlockletStudio
        style={{ opacity: opened ? 1 : 0 }}
        mode="dialog"
        tenantScope={projectId}
        title={project.name || ''}
        description={project.description || ''}
        note=""
        introduction=""
        logo={getProjectIconUrl(projectId, project.updatedAt, { original: true })}
        componentDid={AI_STUDIO_COMPONENT_DID}
        // 透传到 get blocklet resource 的参数
        resourcesParams={{ projectId }}
        dependentComponentsMode="readonly"
        open
        setOpen={() => onClose()}
        onConnected={() => {}}
        onUploaded={() => {}}
        onReleased={() => {}}
        onOpened={() => setOpened(true)}
        // 默认选中的资源
        resources={{
          [AI_STUDIO_COMPONENT_DID]: [],
        }}
      />
    </Suspense>
  );
}
