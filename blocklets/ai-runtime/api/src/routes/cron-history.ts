import { ensureComponentCallOrAdmin } from '@api/libs/security';
import CronHistory from '@api/store/models/cron-history';
import { Router } from 'express';
import Joi from 'joi';

const router = Router();

const createCronHistoryInputSchema = Joi.object<{
  projectId: string;
  projectRef?: string;
  agentId: string;
  cronJobId: string;
  inputs: { [key: string]: any };
  outputs: { [key: string]: any };
  startTime: Date;
  endTime: Date;
}>({
  projectId: Joi.string().required(),
  projectRef: Joi.string().empty(['', null]),
  agentId: Joi.string().required(),
  cronJobId: Joi.string().required(),
  inputs: Joi.object().pattern(Joi.string(), Joi.any()).required(),
  outputs: Joi.object().pattern(Joi.string(), Joi.any()).required(),
  startTime: Joi.date().required(),
  endTime: Joi.date().required(),
});

router.post('/', ensureComponentCallOrAdmin(), async (req, res) => {
  const input = await createCronHistoryInputSchema.validateAsync(req.body, { stripUnknown: true });

  const history = await CronHistory.create({ ...input });

  res.json(history.toJSON());
});

export default router;
