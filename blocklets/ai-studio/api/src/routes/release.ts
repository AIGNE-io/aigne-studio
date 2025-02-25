import { NotFoundError } from '@api/libs/error';
import {
  createOrUpdatePaymentForRelease,
  getActiveSubscriptionOfAssistant,
  getPriceFromPaymentLink,
} from '@api/libs/payment';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { omitBy } from 'lodash';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
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

  res.json({
    releases: await Promise.all(
      releases.map(async (release) => {
        return {
          ...release.dataValues,
          paymentUnitAmount: release.paymentLinkId
            ? await getPriceFromPaymentLink({ paymentLinkId: release.paymentLinkId })
            : undefined,
        };
      })
    ),
  });
});

const getReleaseByAidQuerySchema = Joi.object<{ aid: string }>({
  aid: Joi.string().required(),
});

router.get('/by-aid', async (req, res) => {
  const { aid } = await getReleaseByAidQuerySchema.validateAsync(req.query, { stripUnknown: true });
  const { projectId, projectRef, agentId: assistantId } = parseIdentity(aid, { rejectWhenError: true });

  const release = await Release.findOne({
    where: { projectId, projectRef, assistantId },
    rejectOnEmpty: new NotFoundError('Release not found'),
  });

  res.json({
    ...release.dataValues,
    paymentUnitAmount: release.paymentLinkId
      ? await getPriceFromPaymentLink({ paymentLinkId: release.paymentLinkId })
      : undefined,
  });
});

router.get('/:releaseId', async (req, res) => {
  const { releaseId } = req.params;

  const release = await Release.findByPk(releaseId!, {
    rejectOnEmpty: new NotFoundError(`Release ${releaseId} not found`),
  });

  res.json({
    ...release.dataValues,
    paymentUnitAmount: release.paymentLinkId
      ? await getPriceFromPaymentLink({ paymentLinkId: release.paymentLinkId })
      : undefined,
  });
});

router.get('/:releaseId/subscription', middlewares.session(), middlewares.auth(), async (req, res) => {
  const { did } = req.user!;
  const { releaseId } = req.params;

  if (!releaseId) throw new Error('Missing required param releaseId');

  const subscription = await getActiveSubscriptionOfAssistant({ aid: releaseId, userId: did });

  res.json({ subscription });
});

export interface CreateReleaseInput {
  projectId: string;
  projectRef: string;
  assistantId: string;
  paymentEnabled?: boolean;
  paymentUnitAmount?: string;
}

const createReleaseInputSchema = Joi.object<CreateReleaseInput>({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  assistantId: Joi.string().required(),
  paymentEnabled: Joi.boolean().default(false),
  paymentUnitAmount: Joi.when('paymentEnabled', {
    is: true,
    then: Joi.number().min(0).required().cast('string'),
  }),
});

router.post('/', middlewares.session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { assistantId, projectId, projectRef, ...input } = await createReleaseInputSchema.validateAsync(req.body, {
    stripUnknown: true,
  });

  const { did } = req.user!;

  const release = await Release.create({
    assistantId,
    projectRef,
    projectId,
    createdBy: did,
    updatedBy: did,
    paymentEnabled: input.paymentEnabled,
  });

  if (input.paymentEnabled && input.paymentUnitAmount) {
    await createOrUpdatePaymentForRelease(release, { paymentUnitAmount: input.paymentUnitAmount });
  }

  res.json({
    ...release.dataValues,
    paymentUnitAmount: release.paymentLinkId
      ? await getPriceFromPaymentLink({ paymentLinkId: release.paymentLinkId })
      : undefined,
  });
});

export interface UpdateReleaseInput {
  description?: string;
  paymentEnabled?: boolean;
  paymentUnitAmount?: string;
  openerMessage?: string;
}

const updateReleaseSchema = Joi.object<UpdateReleaseInput>({
  description: Joi.string().allow('', null),
  paymentEnabled: Joi.boolean().default(false),
  paymentUnitAmount: Joi.when('paymentEnabled', {
    is: true,
    then: Joi.number().min(0).required().cast('string'),
  }),
  openerMessage: Joi.string().allow('', null),
});

router.patch('/:releaseId', middlewares.session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { did } = req.user!;
  const { releaseId } = req.params;

  const input = await updateReleaseSchema.validateAsync(req.body, { stripUnknown: true });

  const release = await Release.findByPk(releaseId!, {
    rejectOnEmpty: new NotFoundError(`Release ${releaseId} not found`),
  });

  await release.update(omitBy({ ...input, updatedBy: did }, (v) => v === undefined));

  if (input.paymentEnabled && input.paymentUnitAmount) {
    await createOrUpdatePaymentForRelease(release, { paymentUnitAmount: input.paymentUnitAmount });
  }

  res.json({
    ...release.dataValues,
    paymentUnitAmount: release.paymentLinkId
      ? await getPriceFromPaymentLink({ paymentLinkId: release.paymentLinkId })
      : undefined,
  });
});

router.delete('/:releaseId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { releaseId } = req.params;

  const release = await Release.findByPk(releaseId!, {
    rejectOnEmpty: new NotFoundError(`Release ${releaseId} not found`),
  });
  await release.destroy();

  res.json(release);
});

export default router;
