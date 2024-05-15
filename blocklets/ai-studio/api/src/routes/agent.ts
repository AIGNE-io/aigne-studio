import Project from '@api/store/models/project';
import { getAssistantFromRepository, getRepository } from '@api/store/repository';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { Assistant } from '@blocklet/ai-runtime/types';
import { Router } from 'express';
import Joi from 'joi';
import pick from 'lodash/pick';

const router = Router();

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

  const { projectId, projectRef, assistantId } = parseIdentity(aid, { rejectWhenError: true });

  const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

  const repository = await getRepository({ projectId });

  const assistant = await getAssistantFromRepository({
    repository,
    ref: projectRef,
    assistantId,
    working,
    rejectOnEmpty: true,
  });

  res.json(respondAgentFields(assistant, project));
});

const respondAgentFields = (assistant: Assistant, project: Project) => ({
  ...pick(
    assistant,
    'id',
    'name',
    'description',
    'type',
    'parameters',
    'outputVariables',
    'createdAt',
    'updatedAt',
    'release',
    'entries',
    'createdBy'
  ),
  project: {
    id: project._id,
    name: project.name,
    description: project.description,
    createdBy: project.createdBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  },
});

export default router;
