import { join } from 'path';

import { getAgent, getAgentSecretInputs } from '@api/libs/agent';
import { ResourceType, getProjectFromResource, getResourceProjects } from '@api/libs/resource';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { GetAgentResult } from '@blocklet/ai-runtime/core';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { getComponentMountPoint } from '@blocklet/sdk';
import config from '@blocklet/sdk/lib/config';
import { Router } from 'express';
import { exists } from 'fs-extra';
import Joi from 'joi';
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

  const agents: Agent[] = projects.flatMap((project) =>
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
    const dir = (await getProjectFromResource({ blockletDid, projectId }))?.projectDir;
    const logo = dir ? join(dir, 'logo.png') : undefined;
    if (logo && (await exists(logo))) {
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

router.get('/:aid/assets/:filename', async (req, res) => {
  const { aid, filename } = req.params;
  if (!aid || !filename) throw new Error('Missing required param `aid` or `filename`');

  const { blockletDid } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId } = parseIdentity(aid, { rejectWhenError: true });

  if (blockletDid) {
    const dir = (await getProjectFromResource({ blockletDid, projectId }))?.projectDir;
    const path = dir ? join(dir, 'assets', filename) : undefined;
    if (path && (await exists(path))) {
      res.sendFile(path);
    } else {
      res.status(404).end();
    }
    return;
  }

  // TODO: ai studio 实现存储 assets 到 repo 中之后这里需要像 logo 接口一样重定向到 ai-studio 获取 assets 接口
  res.status(404).end();
});

const respondAgentFields = (
  agent: Omit<GetAgentResult, 'identity'> & { identity: Omit<GetAgentResult['identity'], 'aid'> }
) => ({
  ...pick(agent, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy', 'identity'),
  outputVariables: (agent.outputVariables ?? []).filter((i) => !i.hidden),
  project: pick(agent.project, 'id', 'name', 'description', 'createdBy', 'createdAt', 'updatedAt', 'appearance'),
  identity: {
    ...agent.identity,
    aid: stringifyIdentity(agent.identity),
  },
});

export default router;
