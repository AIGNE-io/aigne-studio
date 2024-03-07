import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { omitBy } from 'lodash';

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Release from '../store/models/release';

const router = Router();

const releaseQuerySchema = Joi.object<{
  projectId: string;
  projectRef?: string;
  assistantId?: string;
}>({
  projectId: Joi.string().required(),
  projectRef: Joi.string().empty(['', null]),
  assistantId: Joi.string().empty(['', null]),
});

router.get('/', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const query = await releaseQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const releases = await Release.findAll({
    where: omitBy({ projectId: query.projectId, assistantId: query.assistantId }, (v) => v === undefined),
    order: [['id', 'DESC']],
  });

  res.json({ releases });
});

router.get('/:releaseId', async (req, res) => {
  const { releaseId } = req.params;

  const release = await Release.findByPk(releaseId!, { rejectOnEmpty: new Error(`Release ${releaseId} not found`) });

  res.json(release);
});

export interface CreateReleaseInput {
  projectId: string;
  projectRef: string;
  assistantId: string;
  template: 'default' | 'blue' | 'red' | 'green';
  icon?: string;
  title?: string;
  description?: string;
  withCollection?: boolean;
}

const createReleaseInputSchema = Joi.object<CreateReleaseInput>({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  assistantId: Joi.string().required(),
  template: Joi.string().valid('default', 'blue', 'red', 'green').required(),
  icon: Joi.string().allow('', null),
  title: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  withCollection: Joi.boolean().default(false),
});

router.post('/', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { title, template, withCollection, description, assistantId, projectId, projectRef, icon } =
    await createReleaseInputSchema.validateAsync(req.body, { stripUnknown: true });

  const { did } = req.user!;

  const doc = await Release.create({
    assistantId,
    projectRef,
    projectId,
    template,
    title,
    withCollection,
    description,
    icon,
    createdBy: did,
    updatedBy: did,
  });

  res.json(doc);
});

export interface UpdateReleaseInput {
  template: 'default' | 'blue' | 'red' | 'green';
  icon?: string;
  title?: string;
  description?: string;
  withCollection?: boolean;
}

const updateReleaseSchema = Joi.object<UpdateReleaseInput>({
  template: Joi.string().valid('default', 'blue', 'red', 'green').empty([null, '']),
  icon: Joi.string().allow('', null),
  title: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  withCollection: Joi.boolean().empty([null]),
});

router.patch('/:releaseId', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { did } = req.user!;
  const { releaseId } = req.params;

  const input = await updateReleaseSchema.validateAsync(req.body, { stripUnknown: true });

  const release = await Release.findByPk(releaseId!, { rejectOnEmpty: new Error(`Release ${releaseId} not found`) });

  await release.update({ ...input, updatedBy: did });

  res.json(release);
});

router.delete('/:releaseId', ensureComponentCallOrAdmin(), async (req, res) => {
  const { releaseId } = req.params;

  const release = await Release.findByPk(releaseId!, { rejectOnEmpty: new Error(`Release ${releaseId} not found`) });
  await release.destroy();

  res.json(release);
});

export default router;
