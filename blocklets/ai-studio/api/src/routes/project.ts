import { cpSync, rmSync } from 'fs';
import { dirname, join } from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { omit, omitBy } from 'lodash';

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getRepository, projects, repositoryRoot } from '../store/projects';

export interface CreateProjectInput {
  duplicateFrom?: string;
  name?: string;
}

const createProjectSchema = Joi.object<CreateProjectInput>({
  duplicateFrom: Joi.string().empty([null, '']),
  name: Joi.string().empty([null, '']),
});

export interface UpdateProjectInput {
  name?: string;
  pinned?: boolean;
}

const updateProjectSchema = Joi.object<UpdateProjectInput>({
  name: Joi.string().empty([null, '']),
  pinned: Joi.boolean().empty([null]),
});

export function projectRoutes(router: Router) {
  router.get('/projects', ensureComponentCallOrPromptsEditor(), async (_req, res) => {
    const list = await projects.cursor().sort({ pinnedAt: -1, updatedAt: -1 }).exec();

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
    const { duplicateFrom, name } = await createProjectSchema.validateAsync(req.body, { stripUnknown: true });
    const { did } = req.user!;

    if (duplicateFrom) {
      const original = await projects.findOne({ _id: duplicateFrom });
      if (!original) throw new Error(`Project ${duplicateFrom} not found`);

      const repo = await getRepository({ projectId: original._id! });

      const project = await projects.insert({
        ...omit(original, '_id'),
        name: original.name && `${original.name}-copy`,
        createdBy: did,
        updatedBy: did,
      });

      const parent = dirname(repo.root);
      cpSync(repo.root, join(parent, project._id!), { recursive: true });
      cpSync(`${repo.root}.cooperative`, join(parent, `${project._id}.cooperative`), { recursive: true });
      res.json(project);
      return;
    }

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

  router.patch('/projects/:projectId', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;

    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    const { name, pinned } = await updateProjectSchema.validateAsync(req.body, { stripUnknown: true });

    if (name && (await projects.findOne({ name, _id: { $ne: project._id } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const { did } = req.user!;

    const [, doc] = await projects.update(
      { _id: projectId },
      {
        $set: omitBy(
          {
            name,
            pinnedAt: pinned ? new Date().toISOString() : pinned === false ? null : undefined,
            updatedBy: did,
          },
          (v) => v === undefined
        ),
      },
      { returnUpdatedDocs: true }
    );

    res.json(doc);
  });

  router.delete('/projects/:projectId', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    await projects.remove({ _id: projectId });

    const root = repositoryRoot(projectId);
    rmSync(root, { recursive: true, force: true });
    rmSync(`${root}.cooperative`, { recursive: true, force: true });

    res.json(project);
  });
}
