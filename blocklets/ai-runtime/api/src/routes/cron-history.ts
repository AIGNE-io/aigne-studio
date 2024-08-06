import { ensureComponentCallOr, ensureComponentCallOrAdmin } from '@api/libs/security';
import CronHistory from '@api/store/models/cron-history';
import { auth } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import omitBy from 'lodash/omitBy';

const router = Router();

const createCronHistoryInputSchema = Joi.object<{
  projectId: string;
  projectRef?: string;
  agentId: string;
  cronJobId: string;
  inputs?: { [key: string]: any };
  outputs?: { [key: string]: any };
  error?: { message: string };
  startTime: Date;
  endTime: Date;
}>({
  projectId: Joi.string().required(),
  projectRef: Joi.string().empty(['', null]),
  agentId: Joi.string().required(),
  cronJobId: Joi.string().required(),
  inputs: Joi.object(),
  outputs: Joi.object(),
  error: Joi.object(),
  startTime: Joi.date().required(),
  endTime: Joi.date().required(),
});

router.post('/', ensureComponentCallOrAdmin(), async (req, res) => {
  const input = await createCronHistoryInputSchema.validateAsync(req.body, { stripUnknown: true });

  const history = await CronHistory.create({ ...input });

  res.json(history.toJSON());
});

const getCronHistoryQuerySchema = Joi.object<{
  blockletDid?: string;
  projectId: string;
  projectRef?: string;
  agentId?: string;
  cronJobId?: string;
  page: number;
  limit: number;
}>({
  blockletDid: Joi.string().empty(['', null]),
  projectId: Joi.string().required(),
  projectRef: Joi.string().empty(['', null]),
  agentId: Joi.string().empty(['', null]),
  cronJobId: Joi.string().empty(['', null]),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(100),
});

router.get('/', ensureComponentCallOr(auth()), async (req, res) => {
  const { blockletDid, projectId, projectRef, agentId, cronJobId, page, limit } =
    await getCronHistoryQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const { rows, count } = await CronHistory.findAndCountAll({
    where: omitBy({ blockletDid, projectId, projectRef, agentId, cronJobId }, (value) => value === undefined),
    offset: (page - 1) * limit,
    limit,
    order: [['createdAt', 'DESC']],
  });

  res.json({ list: rows, count });
});

export default router;
