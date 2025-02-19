import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageModelInfo, ModelBasedAssistantYjs, TextModelInfo } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import AdjustmentsHorizontalIcon from '@iconify-icons/tabler/adjustments-horizontal';
import { Close } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle, IconButton, Theme, useMediaQuery } from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';

import { useCurrentProject } from '../../contexts/project';
import { AIGCModelSettings } from './settings/aigc-model-settings';
import { LLMModelSettings } from './settings/llm-model-settings';
import { useAgentDefaultModel, useAllModels } from './use-models';
import { isModelType, resolveModelType } from './utils';

interface ModelSettingsMenuButtonProps {
  agent: ModelBasedAssistantYjs;
}

export function ModelSettingsMenuButton({ agent }: ModelSettingsMenuButtonProps) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog', popupId: 'model-settings' });
  const models = useAllModels(resolveModelType(agent)!);
  const { projectId, projectRef } = useCurrentProject();
  const defaultModel = useAgentDefaultModel({ projectId, gitRef: projectRef, value: agent });
  const model = models.find((x) => x.model === defaultModel);
  const downSm = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <>
      <IconButton size="small" onClick={dialogState.open} disabled={!model} data-testid="model-settings-menu-button">
        <Icon icon={AdjustmentsHorizontalIcon} />
      </IconButton>
      <Dialog maxWidth="sm" fullWidth fullScreen={downSm} {...bindDialog(dialogState)}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('modelSettings')}</span>
          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {isModelType.llm(agent) && <LLMModelSettings agent={agent} model={model as TextModelInfo} />}
          {isModelType.aigc(agent) && <AIGCModelSettings agent={agent} model={model as ImageModelInfo} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
