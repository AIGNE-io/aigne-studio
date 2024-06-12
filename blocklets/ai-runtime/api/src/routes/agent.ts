import { ResourceType, getAssistantFromResourceBlocklet, getResourceProjects } from '@api/libs/resource';
import Secret from '@api/store/models/secret';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { GetAssistant } from '@blocklet/ai-runtime/core';
import { resolveSecretInputs } from '@blocklet/ai-runtime/core/utils/resolve-secret-inputs';
import { Assistant } from '@blocklet/ai-runtime/types';
import { Router } from 'express';
import Joi from 'joi';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';

const router = Router();

export interface GetAgentsQuery {
  type: ResourceType;
}

const getAgentsQuerySchema = Joi.object<GetAgentsQuery>({
  type: Joi.string()
    .valid('application', 'tool', 'llm-adapter', 'aigc-adapter')
    .empty([null, ''])
    .default('application'),
});

router.get('/', async (req, res) => {
  const query = await getAgentsQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const projects = await getResourceProjects(query.type);

  const resourceAgents = projects.flatMap((project) =>
    project.assistants
      .filter((assistant) => {
        if (query.type === 'application') {
          return project.config?.entry === assistant.id;
        }
        if (['tool', 'llm-adapter', 'aigc-adapter'].includes(query.type)) {
          return assistant.public;
        }
        return false;
      })
      .map((a) => respondAgentFields(a, project.project, project.blocklet))
  );

  res.json({ agents: resourceAgents });
});

export interface GetAgentQuery {
  working?: boolean;
  blockletDid?: string;
}

const getAgentQuerySchema = Joi.object<GetAgentQuery>({
  working: Joi.boolean().empty([null, '']),
  blockletDid: Joi.string().empty([null, '']),
});

router.get('/:aid', async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { blockletDid } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId, assistantId } = parseIdentity(aid, { rejectWhenError: true });

  if (!blockletDid) throw new Error('Missing required query blockletDid');

  const agent = await getAssistantFromResourceBlocklet({
    blockletDid,
    projectId,
    agentId: assistantId,
  });

  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  res.json({
    ...respondAgentFields(agent.agent, agent.project, agent.blocklet),
    config: {
      secrets: await getAgentSecretInputs(agent),
    },
  });
});

const respondAgentFields = (assistant: Assistant, project: any, blocklet?: { did: string }) => ({
  ...pick(assistant, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy'),
  outputVariables: assistant.outputVariables?.map((i) => ({
    ...i,
    // 兼容旧版本数据，2024-06-23 之后可以删掉
    appearance: {
      ...(!i.appearance || isEmpty(i.appearance)
        ? pick(typeof i.initialValue === 'object' ? i.initialValue : {}, 'componentId', 'componentName')
        : i.appearance),
      componentProperties: i.appearance?.componentProperties || (i.initialValue as any)?.componentProps,
    },
  })),
  project: {
    id: project.id,
    name: project.name,
    description: project.description,
    createdBy: project.createdBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    appearance: project.appearance,
  },
  blocklet: blocklet && {
    did: blocklet.did,
  },
});

export default router;

async function getAgentSecretInputs(agent: NonNullable<Awaited<ReturnType<typeof getAssistantFromResourceBlocklet>>>) {
  const projectId = agent.project.id;

  const secrets = await resolveSecretInputs(
    { ...agent.agent, project: agent.project },
    {
      getAssistant: (async (agentId, options) => {
        if (!options?.blockletDid || !options.projectId) throw new Error('Missing required blockletDid or projectId');

        const agent = await getAssistantFromResourceBlocklet({
          agentId,
          blockletDid: options?.blockletDid,
          projectId: options?.projectId,
        });
        if (options?.rejectOnEmpty && !agent?.agent) {
          throw typeof options.rejectOnEmpty === 'boolean'
            ? new Error(`No such agent ${agentId}`)
            : options.rejectOnEmpty;
        }

        if (!agent) return null;

        return { ...agent.agent, project: agent.project };
      }) as GetAssistant,
    }
  );

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
