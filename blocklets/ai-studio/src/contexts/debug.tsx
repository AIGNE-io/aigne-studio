import { useProjectStore } from '@app/pages/project/yjs-state';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNEApiContextValue, getAgent } from '@blocklet/ai-runtime/front';
import { fileFromYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';

import { useCurrentProject } from './project';

export function useDebugAIGNEApiProps(): Partial<AIGNEApiContextValue> {
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting, getFileById } = useProjectStore(projectId, projectRef);

  const getAgentYjs: AIGNEApiContextValue['getAgent'] = async ({ aid }) => {
    const identity = parseIdentity(aid, { rejectWhenError: true });

    if (identity.projectId === projectId) {
      const { agentId } = identity;
      const agent = getFileById(agentId);
      if (!agent) throw new Error(`No such agent ${agentId}`);

      const convertToAgent = () => {
        const file = fileFromYjs((getYjsValue(agent) as Map<any>).toJSON());
        if (!isAssistant(file)) throw new Error(`Invalid agent file type ${agentId}`);

        return {
          ...file,
          project: projectSetting,
          config: {
            // TODO: get secrets
            secrets: [],
          },
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
  };

  return { getAgent: getAgentYjs };
}
