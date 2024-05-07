import { parseIdentity } from '@api/libs/aid';
import Project from '@api/store/models/project';
import { getAssistantFromRepository, getRepository } from '@api/store/repository';
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

  await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

  const repository = await getRepository({ projectId });

  const assistant = await getAssistantFromRepository({
    repository,
    ref: projectRef,
    assistantId,
    working,
  });

  res.json(
    pick(
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
    )
  );
});

export default router;
