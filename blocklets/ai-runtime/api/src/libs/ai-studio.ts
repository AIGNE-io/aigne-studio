import { call } from '@blocklet/sdk/lib/component';
import { joinURL } from 'ufo';

import { getAssistantFromResourceBlocklet } from './resource';

export async function getAgentFromAIStudio({
  projectId,
  projectRef,
  assistantId,
  working,
}: {
  projectId: string;
  projectRef: string;
  assistantId: string;
  working?: boolean;
}): Promise<Awaited<ReturnType<typeof getAssistantFromResourceBlocklet>>> {
  return (
    await call({
      name: 'ai-studio',
      method: 'GET',
      path: joinURL('/api/projects', projectId, '/refs', projectRef, '/agents', assistantId),
      params: { working },
    })
  ).data;
}
