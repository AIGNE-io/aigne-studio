import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import PublishSetting from '../store/models/publish-setting';

const router = Router();

export interface PublishInput {
  template: 'default' | 'blue' | 'red' | 'green';
  projectId: string;
  assistantId: string;
  title?: string;
  icon?: string;
  isCollection?: boolean;
  description?: string;
}

const publishSchema = Joi.object<PublishInput>({
  template: Joi.string().valid('default', 'blue', 'red', 'green').required(),
  projectId: Joi.string().required(),
  assistantId: Joi.string().required(),
  title: Joi.string().allow('', null),
  isCollection: Joi.boolean().default(false),
  description: Joi.string().allow('', null),
  icon: Joi.string().allow('', null),
});

const findSchema = Joi.object<Pick<Partial<PublishInput>, 'projectId' | 'assistantId'>>({
  projectId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
});

const updateSchema = Joi.object<PublishInput>({
  projectId: Joi.string(),
  assistantId: Joi.string(),
  template: Joi.string().valid('default', 'blue', 'red', 'green').empty([null, '']),
  title: Joi.string().allow('', null),
  isCollection: Joi.boolean().empty([null]),
  description: Joi.string().allow('', null),
  icon: Joi.string().allow('', null),
});

router.get('/:projectId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    throw new Error('Missing required params `projectId`');
  }

  const list = await PublishSetting.findAll({ where: { projectId }, order: [['createdAt', 'ASC']] });

  res.json({ projectPublishSettings: list });
});

router.post('/', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { title, template, isCollection, description, assistantId, projectId, icon } =
    await publishSchema.validateAsync(req.body, {
      stripUnknown: true,
    });

  const { did } = req.user!;

  const doc = await PublishSetting.create({
    assistantId,
    projectId,
    template,
    title,
    isCollection,
    description,
    icon,
    createdBy: did,
    updatedBy: did,
  });
  res.json(doc);
});

router.put('/', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const input = await updateSchema.validateAsync(req.body, {
    stripUnknown: true,
  });

  const { projectId, assistantId } = input;

  const publishProject = await PublishSetting.findOne({ where: { assistantId, projectId } });
  if (!publishProject) {
    throw new Error('No such publish project');
  }

  const { did } = req.user!;

  await PublishSetting.update({ ...input, updatedBy: did }, { where: { assistantId, projectId } });

  const doc = await PublishSetting.findOne({ where: { assistantId } });

  res.json(doc);
});

router.delete('/', ensureComponentCallOrAdmin(), async (req, res) => {
  const { projectId, assistantId } = await findSchema.validateAsync(req.query, {
    stripUnknown: true,
  });
  const publishProject = await PublishSetting.findOne({ where: { assistantId, projectId } });
  if (!publishProject) {
    res.status(404).json({ error: 'No such publish project' });
    return;
  }

  await publishProject.destroy();

  res.json(publishProject);
});

export default router;
