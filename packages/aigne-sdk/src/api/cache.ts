import { Agent, AgentWithConfig } from '@blocklet/ai-runtime/types/runtime/agent';
import { joinURL } from 'ufo';

import { aigneRuntimeApi } from './api';

export type { Agent, AgentWithConfig };

export async function deleteAgentCache({ aid }: { aid: string }): Promise<void> {
  return aigneRuntimeApi.delete(joinURL('/api/agents', aid, 'cache')).then((res) => res.data);
}
