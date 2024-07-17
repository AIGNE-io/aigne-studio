import Project from '@api/store/models/project';
import LoadingButton from '@app/components/loading/loading-button';
import { useCurrentProject } from '@app/contexts/project';
import { useIsAdmin } from '@app/contexts/session';
import { getProjectIconUrl } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { BlockletStudio } from '@blocklet/ui-react';
import { Icon } from '@iconify-icon/react';
import BrandAppgalleryIcon from '@iconify-icons/tabler/brand-appgallery';
import { LoadingButtonProps } from '@mui/lab';
import { Box, Tooltip } from '@mui/material';
import { Suspense, useEffect, useState } from 'react';

import { saveButtonState, useProjectState } from '../state';
import { useProjectStore } from '../yjs-state';

export default function PublishButton({ ...props }: LoadingButtonProps) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();
  const {
    state: { project },
  } = useProjectState(projectId, projectRef);

  const [showCreateResource, setShowCreateResource] = useState(false);
  const isAdmin = useIsAdmin();

  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (!showCreateResource) setOpened(false);
  }, [showCreateResource]);

  if ((window.blocklet.DISABLE_AI_STUDIO_PUBLISH === 'true' && !isAdmin) || !project) return null;

  return (
    <>
      <Tooltip disableInteractive title={t('publish')}>
        <LoadingButton
          variant="outlined"
          sx={{ px: 2, minWidth: 0, minHeight: 0, height: 32, border: '1px solid #E5E7EB' }}
          onClick={async (e) => {
            e.stopPropagation();
            await saveButtonState.getState().save?.({ skipConfirm: true, skipCommitIfNoChanges: true });
            setShowCreateResource(true);
          }}
          loading={showCreateResource && !opened}
          startIcon={<Box component={Icon} icon={BrandAppgalleryIcon} />}
          {...props}>
          {props.children || t('publish')}
        </LoadingButton>
      </Tooltip>

      {project && showCreateResource && (
        <PublishDialog
          project={project}
          onClose={() => setShowCreateResource(false)}
          onOpened={() => setOpened(true)}
        />
      )}
    </>
  );
}

function PublishDialog({
  project,
  onClose,
  onOpened,
}: {
  project: Project;
  onClose: () => void;
  onOpened?: () => void;
}) {
  const [logo] = useState(() => getProjectIconUrl(project.id, { original: true, updatedAt: project.updatedAt }));

  const { projectId, projectRef } = useCurrentProject();
  const { store, config } = useProjectStore(projectId, projectRef);
  const hasEntry = store.files[config?.entry!];

  const isAdmin = useIsAdmin();

  if (!project) return null;

  return (
    <Suspense>
      <BlockletStudio
        mode="dialog"
        tenantScope={project.id}
        title={project.name || ''}
        description={project.description || ''}
        note=""
        introduction=""
        logo={logo}
        componentDid={AIGNE_STUDIO_COMPONENT_DID}
        // 透传到 get blocklet resource 的参数
        resourcesParams={{ projectId: project.id, hideOthers: !isAdmin }}
        dependentComponentsMode="readonly"
        open
        setOpen={() => onClose()}
        onConnected={() => {}}
        onUploaded={() => {}}
        onReleased={() => {}}
        onOpened={() => onOpened?.()}
        // 默认选中的资源
        resources={{
          [AIGNE_STUDIO_COMPONENT_DID]: hasEntry ? [`application/${project.id}`] : [],
        }}
      />
    </Suspense>
  );
}
