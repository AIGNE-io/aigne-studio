import LoadingButton from '@app/components/loading/loading-button';
import { useCurrentProject } from '@app/contexts/project';
import { AI_STUDIO_COMPONENT_DID } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { BlockletStudio } from '@blocklet/ui-react';
import { Icon } from '@iconify-icon/react';
import BrandAppgalleryIcon from '@iconify-icons/tabler/brand-appgallery';
import { LoadingButtonProps } from '@mui/lab';
import { Box, Tooltip } from '@mui/material';
import { Suspense, useState } from 'react';

import { saveButtonState, useProjectState } from '../state';
import { useAssistants } from '../yjs-state';

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

  const components = useComponentDeps();

  if (!project) return null;

  return (
    <Suspense>
      <BlockletStudio
        mode="dialog"
        tenantScope={project._id}
        title={project.name || ''}
        description={project.description || ''}
        note=""
        introduction=""
        componentDid={AI_STUDIO_COMPONENT_DID}
        // 透传到 get blocklet resource 的参数
        resourcesParams={{ projectId }}
        open
        setOpen={() => onClose()}
        onConnected={() => {}}
        onUploaded={() => {}}
        onReleased={() => {}}
        onOpened={() => {}}
        // 默认选中的组件
        components={components.map((i) => ({ did: i, included: true, required: true }))}
        // 默认选中的资源
        resources={{
          [AI_STUDIO_COMPONENT_DID]: [],
        }}
      />
    </Suspense>
  );
}

function useComponentDeps() {
  const assistants = useAssistants();

  return [
    ...new Set(
      assistants.flatMap((i) => {
        if (!i.parameters) return [];
        return Object.values(i.parameters).flatMap((i) => {
          if (i.data.type === 'source' && i.data.source?.variableFrom === 'tool') {
            const did = i.data.source.agent?.blockletDid;
            return did ? [did] : [];
          }
          return [];
        });
      })
    ),
  ];
}
