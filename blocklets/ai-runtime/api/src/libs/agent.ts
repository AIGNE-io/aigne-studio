import Secret from '@api/store/models/secret';
import { GetAgentOptions, GetAgentResult } from '@blocklet/ai-runtime/core';
import { resolveSecretInputs } from '@blocklet/ai-runtime/core/utils/resolve-secret-inputs';
import { ProjectSettings } from '@blocklet/ai-runtime/types';

import { getAgentFromAIStudio, getProjectFromAIStudio } from './ai-studio';
import { getAssistantFromResourceBlocklet, getProjectFromResource } from './resource';

export interface GetProjectOptions {
  blockletDid?: string;
  projectId: string;
  working?: boolean;
  rejectOnEmpty?: boolean | Error;
}

export async function getProject(
  options: GetProjectOptions & { rejectOnEmpty?: false }
): Promise<ProjectSettings | null | undefined>;
export async function getProject(
  options: GetProjectOptions & { rejectOnEmpty: true | Error }
): Promise<ProjectSettings>;
export async function getProject({ blockletDid, projectId, working, rejectOnEmpty }: GetProjectOptions) {
  let project: ProjectSettings | undefined;
  if (working) {
    project = await getProjectFromAIStudio({ projectId });
  } else {
    if (!blockletDid) throw new Error('Missing required query blockletDid');
    project = await getProjectFromResource({ blockletDid, projectId });
  }

  if (!project) {
    if (rejectOnEmpty) {
      throw rejectOnEmpty instanceof Error ? rejectOnEmpty : new Error('No such project');
    }
  }

  return project;
}

export async function getAgent(
  options: GetAgentOptions & { rejectOnEmpty?: false }
): Promise<GetAgentResult | undefined>;
export async function getAgent(options: GetAgentOptions & { rejectOnEmpty: true | Error }): Promise<GetAgentResult>;
export async function getAgent({
  working,
  blockletDid,
  projectId,
  projectRef,
  agentId,
  rejectOnEmpty,
}: GetAgentOptions) {
  let agent: GetAgentResult | undefined;

  if (working) {
    if (!projectRef) throw new Error('Missing required query projectRef');

    const res = await getAgentFromAIStudio({ projectId, projectRef, assistantId: agentId, working });
    if (res) agent = { ...res.agent, project: res.project, identity: { projectId, projectRef, working, agentId } };
  } else {
    if (!blockletDid) throw new Error('Missing required query blockletDid');

    const res = await getAssistantFromResourceBlocklet({
      blockletDid,
      projectId,
      agentId,
    });

    if (res) agent = { ...res.agent, project: res.project, identity: { blockletDid, projectId, agentId } };
  }

  if (!agent) {
    if (rejectOnEmpty) {
      throw rejectOnEmpty instanceof Error ? rejectOnEmpty : new Error('No such agent');
    }
  }

  return agent;
}

export async function getAgentSecretInputs(agent: GetAgentResult) {
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
  ).filter((i): i is NonNullable<typeof i> => !!i);

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
