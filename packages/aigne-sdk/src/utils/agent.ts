import { RuntimeOutputVariable, RuntimeOutputVariablesSchema } from '@blocklet/ai-runtime/types/runtime';
import { Agent } from '@blocklet/ai-runtime/types/runtime/agent';
import { joinURL, withQuery } from 'ufo';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../constants';
import { appUrl, getComponentMountPoint } from './component';

export function getAgentProfile(agent: Agent) {
  const profile = agent.outputVariables?.find((i) => i.name === RuntimeOutputVariable.profile)?.initialValue as
    | RuntimeOutputVariablesSchema[RuntimeOutputVariable.profile]
    | undefined;

  const avatar = profile?.avatar;
  const mountPoint = getComponentMountPoint(AIGNE_RUNTIME_COMPONENT_DID);
  const url = avatar
    ? avatar.startsWith('http')
      ? avatar
      : joinURL(appUrl() || '', mountPoint || '', '/api/agents', agent.identity.aid, 'assets', avatar)
    : withQuery(joinURL(appUrl() || '', mountPoint || '', '/api/agents', agent.identity.aid, 'logo'), {
        blockletDid: agent.project.iconVersion || agent.project.updatedAt,
        working: agent.identity.working,
      });

  return {
    icon: withQuery(url, {
      blockletDid: agent.identity.blockletDid,
      imageFilter: 'resize',
      w: 200,
      version: agent.project.updatedAt,
    }),
    name: profile?.name || agent.project.name,
    description: profile?.description || agent.project.description,
    ogImage: profile?.ogImage,
  };
}
