import { ResourceType, getAssistantFromResourceBlocklet, getResourceProjects } from '@api/libs/resource';
import Project from '@api/store/models/project';
import { getAssistantFromRepository, getRepository } from '@api/store/repository';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { Assistant, ProjectSettings } from '@blocklet/ai-runtime/types';
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

  const { working, blockletDid } = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { projectId, projectRef, assistantId } = parseIdentity(aid, { rejectWhenError: true });

  if (blockletDid) {
    const assistantResult = await getAssistantFromResourceBlocklet({
      blockletDid,
      projectId,
      assistantId,
      type: ['application', 'tool'],
    });

    if (!assistantResult) {
      res.status(404).json({ message: 'No such agent' });
      return;
    }

    res.json(respondAgentFields(assistantResult.assistant, assistantResult.project, assistantResult.blocklet));
    return;
  }

  const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

  const repository = await getRepository({ projectId });

  const assistant = await getAssistantFromRepository({
    repository,
    ref: projectRef,
    assistantId,
    working,
    rejectOnEmpty: true,
  });

  res.json(respondAgentFields(assistant, project.dataValues));
});

const respondAgentFields = (assistant: Assistant, project: ProjectSettings, blocklet?: { did: string }) => ({
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
