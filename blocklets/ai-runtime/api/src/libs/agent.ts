import Secret from '@api/store/models/secret';
import { getSupportedImagesModels, getSupportedModels } from '@blocklet/ai-runtime/api/ai-runtime/models';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { getMcpResources } from '@blocklet/ai-runtime/common/mcp';
import { GetAgentOptions, GetAgentResult } from '@blocklet/ai-runtime/core';
import { resolveSecretInputs } from '@blocklet/ai-runtime/core/utils/resolve-secret-inputs';
import {
  Assistant,
  BlockletAgent,
  ProjectSettings,
  ResourceType,
  SelectParameter,
  Variable,
} from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';

import { getAgentFromAIStudio, getMemoryVariablesFromAIStudio, getProjectFromAIStudio } from './ai-studio';
import { NotFoundError } from './error';
import { resourceManager } from './resource';

export interface GetProjectOptions {
  blockletDid?: string;
  projectId: string;
  projectRef?: string;
  working?: boolean;
  rejectOnEmpty?: boolean | Error;
  agents?: boolean;
}

export async function getProject(
  options: GetProjectOptions & { rejectOnEmpty?: false }
): Promise<(ProjectSettings & { agents?: Assistant[] }) | null | undefined>;
export async function getProject(
  options: GetProjectOptions & { rejectOnEmpty: true | Error }
): Promise<ProjectSettings & { agents?: Assistant[] }>;
export async function getProject({
  blockletDid,
  projectId,
  projectRef,
  working,
  rejectOnEmpty,
  agents,
}: GetProjectOptions) {
  let project: (ProjectSettings & { agents?: Assistant[] }) | undefined;
  if (blockletDid) {
    const r = await resourceManager.getProject({ blockletDid, projectId });
    if (r) {
      project = r.project;
      if (agents) project.agents = r.agents;
    }
  } else {
    project = await getProjectFromAIStudio({ projectId, projectRef, working, agents });
  }

  if (!project) {
    if (rejectOnEmpty) {
      throw rejectOnEmpty instanceof Error ? rejectOnEmpty : new NotFoundError('No such project');
    }
  }

  return project;
}

export async function getMemoryVariables({
  blockletDid,
  projectId,
  projectRef,
  working,
}: Omit<GetProjectOptions, 'rejectOnEmpty'>) {
  let variables: Variable[] | undefined;
  if (blockletDid) {
    variables = (await resourceManager.getProject({ blockletDid, projectId }))?.memory.variables;
  } else if (projectRef) {
    variables = (await getMemoryVariablesFromAIStudio({ projectId, projectRef, working })).variables;
  }

  return variables ?? [];
}

export async function getAgent(
  options: GetAgentOptions & { rejectOnEmpty?: false }
): Promise<Exclude<GetAgentResult, BlockletAgent> | undefined>;
export async function getAgent(
  options: GetAgentOptions & { rejectOnEmpty: true | Error }
): Promise<Exclude<GetAgentResult, BlockletAgent>>;
export async function getAgent({ aid, working, rejectOnEmpty }: GetAgentOptions) {
  let agent: GetAgentResult | undefined;
  const { blockletDid, projectId, projectRef = 'main', agentId } = parseIdentity(aid, { rejectWhenError: true });

  if (blockletDid) {
    if (projectId.startsWith('mcp_')) {
      const a = (await getMcpResources({ blockletDid })).find((i) => i.id === agentId);

      if (a) {
        agent = {
          ...a,
          identity: { blockletDid, projectId, agentId, aid },
          project: {
            id: `mcp_${blockletDid}`,
            name: a.mcp?.blocklet.name,
            createdBy: a.createdBy,
            updatedBy: a.updatedBy,
          },
        };
      }
    } else {
      const res = await resourceManager.getAgent({
        blockletDid,
        projectId,
        agentId,
      });

      if (res) {
        agent = {
          ...res.agent,
          project: res.project,
          identity: {
            blockletDid,
            projectId,
            agentId,
            aid: stringifyIdentity({ blockletDid, projectId, agentId }),
          },
        };
      }
    }
  } else {
    const res = await getAgentFromAIStudio({ projectId, projectRef, agentId, working });
    if (res)
      agent = {
        ...res.agent,
        project: res.project,
        identity: {
          projectId,
          projectRef,
          agentId,
          aid: stringifyIdentity({ projectId, projectRef, agentId }),
          working,
        },
      };
  }

  if (!agent) {
    if (rejectOnEmpty) {
      throw rejectOnEmpty instanceof Error ? rejectOnEmpty : new NotFoundError('No such agent');
    }
  }

  return agent;
}

export async function getAgentSecretInputs(agent: GetAgentResult) {
  if (!agent.project) return [];

  const projectId = agent.project.id;

  const secrets = await resolveSecretInputs(agent, { getAgent });

  const readySecrets = (
    await Promise.all(
      secrets.map(async ({ input, agent }) =>
        Secret.findOne({
          where: {
            projectId,
            targetProjectId: agent.project.id,
            targetAgentId: agent.id,
            targetInputKey: input.key,
          },
        })
      )
    )
  ).filter(isNonNullable);

  return secrets.map((i) => ({
    targetProjectId: i.agent.project.id,
    targetAgentId: i.agent.id,
    targetInput: i.input,
    hasValue: readySecrets.some(
      (j) =>
        j.targetInputKey === i.input.key && j.targetProjectId === i.agent.project.id && j.targetAgentId === i.agent.id
    ),
  }));
}

async function isBuiltinModel(model: string) {
  const models = [...(await getSupportedImagesModels()), ...(await getSupportedModels())];
  return models.find((x) => x.model === model);
}

export async function getAdapter({ type, model }: { type: 'prompt' | 'image'; model: string }) {
  if (type === 'prompt' || type === 'image') {
    if (await isBuiltinModel(model)) {
      return null;
    }
    const projects = await resourceManager.getProjects({
      type: { prompt: 'llm-adapter', image: 'aigc-adapter' }[type] as ResourceType,
    });
    const agents = projects
      .flatMap((x) => {
        return x.agents.map((y) => ({
          blockletDid: x.blocklet.did,
          projectId: x.project.id,
          agent: y,
        }));
      })
      .filter(
        (x) =>
          x.agent.public &&
          (x.agent.parameters?.find((x) => x.key === 'model') as SelectParameter)?.options?.find(
            (x) => x.label === model || x.value === model
          )
      );
    return agents[0] || null;
  }
  return null;
}
