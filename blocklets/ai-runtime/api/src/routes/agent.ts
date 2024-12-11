import { join } from 'path';

import { getAgent, getAgentSecretInputs } from '@api/libs/agent';
import { resourceManager } from '@api/libs/resource';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { Assistant, ProjectSettings, ResourceType } from '@blocklet/ai-runtime/types';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { getComponentMountPoint } from '@blocklet/sdk';
import { Router } from 'express';
import { exists } from 'fs-extra';
import Joi from 'joi';
import pick from 'lodash/pick';
import { joinURL, withHttps, withQuery } from 'ufo';

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
      .map((agent) =>
        respondAgentFields({
          agent,
          identity: {
            aid: stringifyIdentity({
              blockletDid: project.blocklet.did,
              projectId: project.project.id,
              agentId: agent.id,
            }),
          },
          project: project.project,
        })
      )
  );

  res.json({ agents });
});

export interface GetAgentQuery {
  working?: boolean;
}

const getAgentQuerySchema = Joi.object<GetAgentQuery>({
  working: Joi.boolean().empty([null, '']),
});

router.get('/:aid', async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { working } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const agent = await getAgent({ aid, working });

  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  res.json({
    ...respondAgentFields({
      agent,
      project: agent.project,
      identity: agent.identity,
    }),
    config: { secrets: await getAgentSecretInputs(agent) },
  });
});

router.get('/:aid/logo', async (req, res) => {
  const { aid } = req.params;
  if (!aid) throw new Error('Missing required param `aid`');

  const { blockletDid, projectId, projectRef } = parseIdentity(aid, { rejectWhenError: true });

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
    withQuery(
      joinURL(
        withHttps(req.hostname),
        getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID),
        '/api/projects/',
        projectId,
        '/logo.png'
      ),
      {
        projectRef,
        ...pick(req.query, 'version', 'working'),
      }
    )
  );
});

router.get('/:aid/assets/:filename', async (req, res) => {
  const { aid, filename } = req.params;
  if (!aid || !filename) throw new Error('Missing required param `aid` or `filename`');

  const { blockletDid, projectId, projectRef = 'main' } = parseIdentity(aid, { rejectWhenError: true });

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
      withHttps(req.hostname),
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

export const respondAgentFields = ({
  agent,
  project,
  identity,
}: {
  agent: Assistant;
  project: ProjectSettings;
  identity: {
    aid: string;
    working?: boolean;
  };
}): Agent => ({
  ...pick(agent, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy', 'tags'),
  access: pick(agent.access, 'noLoginRequired'),
  outputVariables: (agent.outputVariables ?? []).filter((i) => !i.hidden),
  project: pick(
    project,
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
    ...parseIdentity(identity.aid, { rejectWhenError: true }),
    ...identity,
  },
});

export default router;
