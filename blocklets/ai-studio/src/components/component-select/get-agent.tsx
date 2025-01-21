import { useCurrentProject } from '@app/contexts/project';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_COMPONENTS_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { RuntimeOutputVariable, fileFromYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { getAgent } from '@blocklet/aigne-sdk/api/agent';
import type { AIGNEApiContextValue } from '@blocklet/aigne-sdk/components/ai-runtime';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { nanoid } from 'nanoid';
import { useCallback, useMemo } from 'react';

import { SupportedShares } from '../file-editor/output/ShareSettings';

export function useAIGNEApiProps({
  apiUniqueKey,
  customComponent,
}: {
  apiUniqueKey: string;
  customComponent: { blockletDid?: string; id: string; name?: string; componentProperties?: any };
}): Partial<AIGNEApiContextValue> {
  const { projectId, projectRef } = useCurrentProject();
  const { getFileById, projectSetting } = useProjectStore(projectId, projectRef);

  const getAgentYjs = useCallback<AIGNEApiContextValue['getAgent']>(
    async ({ aid }) => {
      const identity = parseIdentity(aid, { rejectWhenError: true });

      if (identity.projectId === projectId) {
        const { agentId } = identity;
        const agent = getFileById(agentId);
        if (!agent) throw new Error(`No such agent ${agentId}`);

        const convertToAgent = () => {
          const file = fileFromYjs((getYjsValue(agent) as Map<any>).toJSON());
          if (!isAssistant(file)) throw new Error(`Invalid agent file type ${agentId}`);

          file.outputVariables ??= [];

          // preview page layout
          {
            let appearancePage = file.outputVariables.find((i) => i.name === RuntimeOutputVariable.appearancePage);
            if (!appearancePage) {
              appearancePage = {
                id: nanoid(),
                name: RuntimeOutputVariable.appearancePage,
              };
              file.outputVariables.push(appearancePage);
            }
            appearancePage.appearance = {
              componentBlockletDid: AIGNE_COMPONENTS_COMPONENT_DID,
              componentId: customComponent.id,
              componentName: customComponent.name,
            };
          }

          // preview share output
          {
            let share = file.outputVariables.find((i) => i.name === RuntimeOutputVariable.share);
            if (!share) {
              share = {
                id: nanoid(),
                name: RuntimeOutputVariable.share,
              };
              file.outputVariables.push(share);
            }
            share.initialValue = {
              items: SupportedShares,
            };
          }

          return {
            ...file,
            project: projectSetting,
            config: { secrets: [] },
          };
        };

        return {
          ...convertToAgent(),
          // TODO: throttle the update
          observe: (listener) => {
            const yjs = getYjsValue(agent) as Map<any>;
            const observer = () => listener(convertToAgent());
            yjs.observeDeep(observer);
            return () => yjs.unobserveDeep(observer);
          },
        };
      }

      return getAgent({ aid, working: true });
    },
    [projectId, customComponent.id]
  );

  return useMemo(() => ({ apiUniqueKey, getAgent: getAgentYjs }), [apiUniqueKey, getAgentYjs]);
}
