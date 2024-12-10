import {
  ImageAssistantYjs,
  ImageModelInfo,
  ModelBasedAssistantYjs,
  PromptAssistantYjs,
  TextModelInfo,
} from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import Menu2Icon from '@iconify-icons/tabler/menu-2';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';

import { useCurrentProject } from '../../contexts/project';
import { AIGCModelSettings } from './settings/aigc-model-settings';
import { LLMModelSettings } from './settings/llm-model-settings';
import { useAgentDefaultModel, useAllModels } from './use-models';
import { resolveModelType } from './utils';

interface ModelSettingsMenuButtonProps {
  agent: ModelBasedAssistantYjs;
}

export function ModelSettingsMenuButton({ agent }: ModelSettingsMenuButtonProps) {
  const dialogState = usePopupState({ variant: 'dialog', popupId: 'model-settings' });
  const modelType = resolveModelType(agent.type)!;
  const models = useAllModels(modelType);
  const { projectId, projectRef } = useCurrentProject();
  const defaultModel = useAgentDefaultModel({ projectId, gitRef: projectRef, value: agent });
  const model = models.find((x) => x.model === defaultModel);

  return (
    <>
      <IconButton size="small" onClick={dialogState.open} disabled={!model}>
        <Icon icon={Menu2Icon} />
      </IconButton>
      <Dialog maxWidth="sm" fullWidth {...bindDialog(dialogState)}>
        <DialogTitle>Model Settings</DialogTitle>
        <DialogContent>
          {modelType === 'llm' && (
            <LLMModelSettings agent={agent as PromptAssistantYjs} model={model as TextModelInfo} />
          )}
          {modelType === 'aigc' && (
            <AIGCModelSettings agent={agent as ImageAssistantYjs} model={model as ImageModelInfo} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
