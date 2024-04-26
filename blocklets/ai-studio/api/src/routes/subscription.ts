import { getActiveSubscriptionOfAssistant } from '@api/libs/payment';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

const router = Router();

const getSubscriptionQuerySchema = Joi.object<{ aid: string }>({
  aid: Joi.string().required(),
});

router.get('/by-aid', user(), auth(), async (req, res) => {
  const { did } = req.user!;
  const { aid } = await getSubscriptionQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const subscription = await getActiveSubscriptionOfAssistant({ aid, userId: did });

  res.json({ subscription });
});

export default router;
