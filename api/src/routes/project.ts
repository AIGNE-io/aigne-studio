import { rmSync } from 'fs';

import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getRepository, projects } from '../store/projects';

export function projectRoutes(router: Router) {
  const projectSchema = Joi.object<{ name?: string }>({
    name: Joi.string().empty(null),
  });

  router.get('/projects', ensureComponentCallOrPromptsEditor(), async (_req, res) => {
    const list = await projects.cursor().sort({ createdAt: 1 }).exec();

    res.json({ projects: list });
  });

  router.get('/projects/:projectId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;

    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    res.json(project);
  });

  router.post('/projects', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { name } = await projectSchema.validateAsync(req.body, { stripUnknown: true });
    const { did } = req.user!;

    if (name && (await projects.findOne({ name }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const project = await projects.insert({
      name,
      createdBy: did,
      updatedBy: did,
    });

    res.json(project);
  });

  router.put('/projects/:projectId', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;

    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    const { name } = await projectSchema.validateAsync(req.body, { stripUnknown: true });

    if (name && (await projects.findOne({ name, _id: { $ne: project._id } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const { did } = req.user!;

    const [, doc] = await projects.update(
      { _id: projectId },
      {
        $set: {
          name,
          updatedBy: did,
        },
      },
      { returnUpdatedDocs: true }
    );

    res.json(doc);
  });

  router.delete('/projects/:projectId', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;

    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    await projects.remove({ _id: projectId });
    rmSync(getRepository(projectId).dir, { recursive: true });

    res.json(project);
  });
}
