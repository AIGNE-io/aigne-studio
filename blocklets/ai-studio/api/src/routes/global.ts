import type { Router } from 'express';
import Joi from 'joi';
import { uniqBy } from 'lodash';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { getAssistantsOfRepository } from '../store/repository';

const getAssistantsQuerySchema = Joi.object<{
  projectId?: string;
  ref?: string;
  offset: number;
  limit?: number;
  tag?: string;
  type?: 'prompt' | 'function' | 'api';
}>({
  projectId: Joi.string().empty(''),
  ref: Joi.string().empty(''),
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).empty(null),
  tag: Joi.string().empty(''),
  type: Joi.string().valid('prompt', 'function', 'api').empty(''),
});

export function globalRoutes(router: Router) {
  const getTagsQuerySchema = Joi.object<{ projectId?: string; search?: string }>({
    projectId: Joi.string().empty(''),
    search: Joi.string().empty(''),
  });

  router.get('/tags', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, search } = await getTagsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    let defaultBranch: string;
    let projectIds: Array<{
      projectId: string;
      ref: string;
    }>;
    if (projectId) {
      defaultBranch = (
        await Project.findByPk(projectId, {
          rejectOnEmpty: new Error(`Project ${projectId} not found`),
        })
      ).gitDefaultBranch;
      projectIds = [
        {
          projectId,
          ref: defaultBranch,
        },
      ];
    } else {
      projectIds = (await Project.findAll({ order: [['createdAt', 'ASC']] })).map((i) => ({
        projectId: i.id,
        ref: i.gitDefaultBranch,
      }));
    }

    let tags = uniqBy(
      (
        await Promise.all(
          projectIds.map((i) => getAssistantsOfRepository({ projectId: i.projectId, ref: i.ref ?? defaultBranch }))
        )
      )
        .flatMap((assistants) => assistants.map((i) => i.tags?.map((tag) => ({ tag, type: i.type }))))
        .flatMap((i) => i ?? []),
      'tag'
    );

    if (search) {
      const regex = new RegExp(search, 'i');
      tags = tags.filter((i) => regex.test(i.tag));
    }

    res.json({ tags: tags.map((i) => ({ name: i.tag })) });
  });

  router.get('/assistants', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { offset, limit, projectId, tag, type, ref } = await getAssistantsQuerySchema.validateAsync(req.query, {
      stripUnknown: true,
    });

    const projectIds = projectId
      ? [projectId]
      : (await Project.findAll({ order: [['createdAt', 'ASC']] })).map((i) => i.id);

    let assistants = (
      await Promise.all(
        projectIds.map(async (projectId) =>
          getAssistantsOfRepository({
            projectId,
            ref:
              ref ||
              (
                await Project.findByPk(projectId, {
                  rejectOnEmpty: new Error(`Project ${projectId} not found`),
                })
              ).gitDefaultBranch,
          }).then((assistants) =>
            assistants.map((assistant) => ({
              ...assistant,
              projectId,
              ref,
            }))
          )
        )
      )
    ).flat();

    if (tag) {
      assistants = assistants.filter((i) => i.tags?.includes(tag));
    }

    if (type) {
      assistants = assistants.filter((i) => i.type === type);
    }

    assistants.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    res.json({ assistants: assistants.slice(offset, limit ? offset + limit : undefined) });
  });
}
