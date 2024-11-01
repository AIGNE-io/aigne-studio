import { ensureComponentCallOrAuth } from '@api/libs/security';
import Project from '@api/store/models/project';
import { defaultBranch, getAssistantsOfRepository } from '@api/store/repository';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { Assistant, ProjectSettings } from '@blocklet/ai-runtime/types';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { config } from '@blocklet/sdk';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';

const router = Router();

router.get('/', middlewares.session(), ensureComponentCallOrAuth(), async (req, res) => {
  const projects = await Project.findAll({
    where: { ...(req.user && config.env.tenantMode === 'multiple' ? { createdBy: req.user.did } : {}) },
  });

  const agents: Agent[] = (
    await Promise.all(
      projects.map(async (project) => {
        const projectRef = project.gitDefaultBranch || defaultBranch;

        const agents = await getAssistantsOfRepository({
          projectId: project.id,
          ref: projectRef,
          working: true,
        });
        return agents.map((agent) => ({
          ...respondAgentFields(agent, {
            ...project,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          }),
          identity: {
            aid: stringifyIdentity({ projectId: project.id, projectRef, agentId: agent.id }),
            projectId: project.id,
            projectRef,
            agentId: agent.id,
            working: true,
          },
        }));
      })
    )
  ).flat();

  res.json({ agents });
});

const respondAgentFields = (assistant: Assistant, project: ProjectSettings) => ({
  ...pick(assistant, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy'),
  outputVariables: (assistant.outputVariables ?? [])
    .filter((i) => !i.hidden)
    .map((i) => ({
      ...i,
      // 兼容旧版本数据，2024-06-23 之后可以删掉
      appearance: {
        ...(!i.appearance || isEmpty(i.appearance)
          ? pick(typeof i.initialValue === 'object' ? i.initialValue : {}, 'componentId', 'componentName')
          : i.appearance),
        componentProperties: i.appearance?.componentProperties || (i.initialValue as any)?.componentProps,
      },
    })),
  project: {
    id: project.id,
    name: project.name,
    description: project.description,
    createdBy: project.createdBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    appearance: project.appearance,
  },
});

export default router;
