import { useCurrentProject } from '@app/contexts/project';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { AssistantYjs, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { RuntimeOutputVariable, isAssistant } from '@blocklet/ai-runtime/types';
import { Divider, Stack } from '@mui/material';
import type { ComponentType } from 'react';

import AppearanceComponentSettings from '../output/AppearanceComponentSettings';
import ChildrenSettings from '../output/ChildrenSettings';
import OpeningMessageSettings from '../output/OpeningMessageSettings';
import OpeningQuestionsSettings from '../output/OpeningQuestionsSettings';
import ProfileSettings from '../output/ProfileSettings';
import ShareSettings from '../output/ShareSettings';

export default function AppearanceSettings({ agentId, outputId }: { agentId: string; outputId: string }) {
  const { t } = useLocaleContext();

  const { projectId, projectRef } = useCurrentProject();
  const { store } = useProjectStore(projectId, projectRef);

  const file = store.files[agentId];
  if (!file) throw new Error(`Agent ${agentId} not found`);
  if (!isAssistant(file)) throw new Error(`File ${agentId} is not an agent`);

  const output = file.outputVariables?.[outputId]?.data;

  if (!output) throw new Error(`Output ${outputId} of agent ${agentId} not found`);

  const SpecialSettings = SpecialOutputSettingComponents[output.name!];

  return (
    <Stack>
      {SpecialSettings && (
        <>
          <Divider textAlign="left">{t('basic')}</Divider>

          <SpecialSettings agent={file} output={output} />
        </>
      )}

      <AppearanceComponentSettings output={output} />
    </Stack>
  );
}

const SpecialOutputSettingComponents: {
  [name: string]: ComponentType<{ agent: AssistantYjs; output: OutputVariableYjs }>;
} = {
  [RuntimeOutputVariable.profile]: ProfileSettings,
  [RuntimeOutputVariable.openingQuestions]: OpeningQuestionsSettings,
  [RuntimeOutputVariable.openingMessage]: OpeningMessageSettings,
  [RuntimeOutputVariable.share]: ShareSettings,
  [RuntimeOutputVariable.children]: ChildrenSettings,
};
