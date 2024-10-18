import { getAgent, getAgentSecretInputs, getProject } from '@api/libs/agent';
import { ensureAgentAdmin } from '@api/libs/security';
import Secret from '@api/store/models/secret';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import config from '@blocklet/sdk/lib/config';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
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

router.post('/', user(), auth(), async (req, res) => {
  const { did: userId } = req.user!;

  const input = await createOrUpdateSecretsInputSchema.validateAsync(req.body, { stripUnknown: true });

  await ensureAgentAdmin(req, async () => {
    return (
      await Promise.all(
        input.secrets.map(async ({ projectId }) => {
          const project = await getProject({ projectId, working: true, rejectOnEmpty: true });
          return project.createdBy;
        })
      )
    ).filter(isNonNullable);
  });

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

export interface GetHasValueQuery {
  projectId: string;
  targetProjectId: string;
  targetAgentId: string;
  targetBlockletDid?: string;
}

const getHasValueQuerySchema = Joi.object<GetHasValueQuery>({
  projectId: Joi.string().required(),
  targetProjectId: Joi.string().required(),
  targetAgentId: Joi.string().required(),
  targetBlockletDid: Joi.string().empty([null, '']),
});

router.get('/has-value', user(), auth(), async (req, res) => {
  const query = await getHasValueQuerySchema.validateAsync(req.query, { stripUnknown: true });

  await ensureAgentAdmin(req, async () => {
    const project = await getProject({
      projectId: query.projectId,
      working: true,
      rejectOnEmpty: true,
    });
    return project.createdBy ?? [];
  });

  let globalAuthorized = false;

  if (query.targetBlockletDid) {
    const agent = await getAgent({
      aid: stringifyIdentity({
        blockletDid: query.targetBlockletDid,
        projectId: query.targetProjectId,
        agentId: query.targetAgentId,
      }),
      working: true,
      rejectOnEmpty: true,
    });

    if (agent) {
      const authInputs = (agent.parameters || [])?.filter(
        (i) => i.key && i.type === 'source' && i.source?.variableFrom === 'secret' && !i.hidden
      );

      globalAuthorized = authInputs.every((i) => !!config.env[i.key?.toLocaleUpperCase()!]);
    }
  }

  const secrets = await Secret.findAll({
    where: {
      projectId: query.projectId,
      targetProjectId: query.targetProjectId,
      targetAgentId: query.targetAgentId,
    },
    attributes: { exclude: ['secret'] },
  });

  res.json({ secrets, globalAuthorized });
});

const getSecretsQuerySchema = Joi.object<{
  aid: string;
  working?: boolean;
}>({
  aid: Joi.string().required(),
  working: Joi.boolean().empty([null, '']),
});

router.get('/by-aid', async (req, res) => {
  const { aid, working } = await getSecretsQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const agent = await getAgent({ aid, working });
  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  const secrets = await getAgentSecretInputs(agent);
  res.json({ secrets });
});

export default router;
