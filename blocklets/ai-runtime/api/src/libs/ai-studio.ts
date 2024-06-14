import { ProjectSettings, Variable } from '@blocklet/ai-runtime/types';
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

export async function getProjectFromAIStudio({ projectId }: { projectId: string }): Promise<ProjectSettings> {
  return (
    await call({
      name: 'ai-studio',
      method: 'GET',
      path: joinURL('/api/projects', projectId),
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
