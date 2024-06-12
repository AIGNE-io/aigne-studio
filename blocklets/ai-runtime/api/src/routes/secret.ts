import { ensureAdmin } from '@api/libs/security';
import Secret from '@api/store/models/secret';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

const router = Router();

export interface CreateOrUpdateSecretsInput {
  secrets: {
    projectId: string;
    targetProjectId: string;
    targetAgentId: string;
    targetInputKey: string;
    secret: string;
  }[];
}

const createOrUpdateSecretsInputSchema = Joi.object<CreateOrUpdateSecretsInput>({
  secrets: Joi.array()
    .items(
      Joi.object({
        projectId: Joi.string().required(),
        targetProjectId: Joi.string().required(),
        targetAgentId: Joi.string().required(),
        targetInputKey: Joi.string().required(),
        secret: Joi.string().required(),
      })
    )
    .required()
    .min(1),
});

router.post('/', user(), ensureAdmin, async (req, res) => {
  const { did: userId } = req.user!;

  const input = await createOrUpdateSecretsInputSchema.validateAsync(req.body, { stripUnknown: true });

  await Promise.all(
    input.secrets.map((item) =>
      Secret.destroy({
        where: {
          projectId: item.projectId,
          targetProjectId: item.targetProjectId,
          targetAgentId: item.targetAgentId,
          targetInputKey: item.targetInputKey,
        },
      })
    )
  );

  await Secret.bulkCreate(
    input.secrets.map((item) => ({
      projectId: item.projectId,
      targetProjectId: item.targetProjectId,
      targetAgentId: item.targetAgentId,
      targetInputKey: item.targetInputKey,
      secret: item.secret,
      createdBy: userId,
      updatedBy: userId,
    }))
  );

  res.json({});
});

export default router;
