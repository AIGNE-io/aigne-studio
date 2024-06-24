import { getAgent, getAgentSecretInputs } from '@api/libs/agent';
import { ResourceType, getProjectFromResource, getResourceProjects } from '@api/libs/resource';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { GetAgentResult } from '@blocklet/ai-runtime/core';
import { getComponentMountPoint } from '@blocklet/sdk';
import config from '@blocklet/sdk/lib/config';
import { Router } from 'express';
import Joi from 'joi';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { joinURL } from 'ufo';

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

  const projects = await getResourceProjects({ type: query.type });

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
      .map((a) =>
        respondAgentFields({
          ...a,
          project: project.project,
          identity: {
            blockletDid: project.blocklet.did,
            projectId: project.project.id,
            agentId: a.id,
          },
        })
      )
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

  const { blockletDid, working } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId, projectRef, assistantId } = parseIdentity(aid, { rejectWhenError: true });

  const agent = await getAgent({ blockletDid, projectId, projectRef, agentId: assistantId, working });

  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  res.json({
    ...respondAgentFields(agent),
    config: {
      secrets: await getAgentSecretInputs(agent),
    },
  });
});

router.get('/:aid/logo', async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { blockletDid } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId } = parseIdentity(aid, { rejectWhenError: true });

  if (blockletDid) {
    const logo = (await getProjectFromResource({ blockletDid, projectId }))?.gitLogoPath;
    if (logo) {
      res.sendFile(logo);
    } else {
      res.status(404).end();
    }
    return;
  }
  res.redirect(
    joinURL(
      config.env.appUrl,
      getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID),
      '/api/projects/',
      projectId,
      '/logo.png'
    )
  );
});

const respondAgentFields = (agent: GetAgentResult) => ({
  ...pick(agent, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy', 'identity'),
  outputVariables: agent.outputVariables?.map((i) => ({
    ...i,
    // 兼容旧版本数据，2024-06-23 之后可以删掉
    appearance: {
      ...(!i.appearance || isEmpty(i.appearance)
        ? pick(typeof i.initialValue === 'object' ? i.initialValue : {}, 'componentId', 'componentName')
        : i.appearance),
      componentProperties: i.appearance?.componentProperties || (i.initialValue as any)?.componentProps,
    },
  })),
  project: pick(agent.project, 'id', 'name', 'description', 'createdBy', 'createdAt', 'updatedAt', 'appearance'),
});

export default router;
