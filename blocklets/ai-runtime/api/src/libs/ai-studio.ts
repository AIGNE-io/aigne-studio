import { ProjectSettings, Variable } from '@blocklet/ai-runtime/types';
import { call } from '@blocklet/sdk/lib/component';
import { joinURL } from 'ufo';

import { getAssistantFromResourceBlocklet } from './resource';

export async function getAgentFromAIStudio({
  projectId,
  projectRef,
  agentId,
  working,
}: {
  projectId: string;
  projectRef: string;
  agentId: string;
  working?: boolean;
}): Promise<NonNullable<Awaited<ReturnType<typeof getAssistantFromResourceBlocklet>>>> {
  return (
    await call({
      name: 'ai-studio',
      method: 'GET',
      path: joinURL('/api/projects', projectId, '/refs', projectRef, '/agents', agentId),
      params: { working },
    })
  ).data;
}

export async function getProjectFromAIStudio({
  projectId,
  projectRef,
  working,
}: {
  projectId: string;
  projectRef?: string;
  working?: boolean;
}): Promise<ProjectSettings> {
  return (
    await call({
      name: 'ai-studio',
      method: 'GET',
      path: joinURL('/api/projects', projectId),
      params: { projectRef, working },
    })
  ).data;
}

export async function getMemoryVariablesFromAIStudio({
  projectId,
  projectRef,
  working,
}: {
  projectId: string;
  projectRef: string;
  working?: boolean;
}): Promise<{ variables: Variable[] }> {
  return (
    await call({
      name: 'ai-studio',
      method: 'GET',
      path: joinURL('/api/projects', projectId, 'refs', projectRef, '/memory/variables'),
      params: { working },
    })
  ).data;
}
