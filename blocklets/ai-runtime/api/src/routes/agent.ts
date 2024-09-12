import { join } from 'path';

import { getAgent, getAgentSecretInputs } from '@api/libs/agent';
import { resourceManager } from '@api/libs/resource';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { Assistant, ProjectSettings, ResourceType } from '@blocklet/ai-runtime/types';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { getComponentMountPoint } from '@blocklet/sdk';
import { call } from '@blocklet/sdk/lib/component';
import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import { exists } from 'fs-extra';
import Joi from 'joi';
import pick from 'lodash/pick';
import { joinURL, withQuery } from 'ufo';

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

  const projects = await resourceManager.getProjects({ type: query.type });

  const agents: Agent[] = projects.flatMap((project) =>
    project.agents
      .filter((agent) => {
        if (query.type === 'application') {
          return project.config?.entry === agent.id;
        }
        if (['tool', 'llm-adapter', 'aigc-adapter'].includes(query.type)) {
          return agent.public;
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

  res.json({ agents });
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

  const { projectId, projectRef, agentId } = parseIdentity(aid, { rejectWhenError: true });

  const agent = await getAgent({ blockletDid, projectId, projectRef, agentId, working });

  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  res.json({ ...respondAgentFields(agent), config: { secrets: await getAgentSecretInputs(agent) } });
});

router.get('/publish/:deploymentId', user(), async (req, res) => {
  const { deploymentId } = req.params;
  const { did: userId, role } = req.user! || {};
  if (!deploymentId) throw new Error('Missing required param `deploymentId`');

  const publish = (
    await call({
      name: 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB',
      method: 'GET',
      path: joinURL('/api/deployments', deploymentId),
    })
  ).data;
  if (!publish) {
    res.status(404).json({ message: 'current agent application not published' });
    return;
  }

  if (publish.access === 'private') {
    if (!userId) {
      res.status(403).json({ message: 'This is a private application. Please log in to access.' });
      return;
    }

    const list = ['admin', 'owner'];
    if (!list.includes(role)) {
      res.status(403).json({ message: 'Only an administrator or owner can visit a private publication.' });
      return;
    }
  }

  const { blockletDid, working } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId, projectRef, agentId } = publish;

  const agent = await getAgent({ blockletDid, projectId, projectRef, agentId, working });

  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  res.json({ ...respondAgentFields(agent), config: { secrets: await getAgentSecretInputs(agent) } });
});

router.get('/:aid/logo', async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { blockletDid } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId, projectRef } = parseIdentity(aid, { rejectWhenError: true });

  if (blockletDid) {
    const dir = (await resourceManager.getProject({ blockletDid, projectId }))?.dir;
    const logo = dir ? join(dir, 'logo.png') : undefined;
    if (logo && (await exists(logo))) {
      res.sendFile(logo);
    } else {
      res.status(404).end();
    }
    return;
  }

  res.redirect(
    withQuery(joinURL(getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID), '/api/projects/', projectId, '/logo.png'), {
      projectRef,
      ...pick(req.query, 'version', 'working'),
    })
  );
});

router.get('/:aid/assets/:filename', async (req, res) => {
  const { aid, filename } = req.params;
  if (!aid || !filename) throw new Error('Missing required param `aid` or `filename`');

  const { blockletDid } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId, projectRef } = parseIdentity(aid, { rejectWhenError: true });

  if (blockletDid) {
    const dir = (await resourceManager.getProject({ blockletDid, projectId }))?.dir;
    const path = dir ? join(dir, 'assets', filename) : undefined;
    if (path && (await exists(path))) {
      res.sendFile(path);
    } else {
      res.status(404).end();
    }
    return;
  }

  res.redirect(
    joinURL(
      getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID),
      '/api/projects/',
      projectId,
      'refs',
      projectRef,
      'assets',
      filename
    )
  );
});

export const respondAgentFields = (
  agent: Assistant & {
    identity: Omit<Agent['identity'], 'aid'>;
    project: ProjectSettings;
  }
): Agent => ({
  ...pick(agent, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy', 'identity'),
  outputVariables: (agent.outputVariables ?? []).filter((i) => !i.hidden),
  project: pick(
    agent.project,
    'id',
    'name',
    'description',
    'createdBy',
    'createdAt',
    'updatedAt',
    'appearance',
    'iconVersion'
  ),
  identity: {
    ...agent.identity,
    aid: stringifyIdentity(agent.identity),
  },
});

export default router;
