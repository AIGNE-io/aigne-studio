import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { fileToYjs } from '@blocklet/ai-runtime/types';
import { getResources } from '@blocklet/sdk/lib/component';
import { uniqBy } from 'lodash';
import { parse, stringify } from 'yaml';

import Project from '../store/models/project';
import { getRepository, repositoryRoot } from '../store/repository';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const getResourcePackageAssistantsDirs = () => {
  const resources = getResources({ types: [{ did: AI_STUDIO_DID, type: 'ai' }] });
  return resources.map((resource) => ({ path: resource.path!, did: resource.did! })).filter((x) => !!x.path);
};

export const copyAssistantsFromResource = async ({
  folder,
  findProjectId,
  newProjectId,
  originDefaultBranch,
  projectInfo,
}: {
  folder: string;
  findProjectId: string;
  newProjectId: string;
  fullName: string;
  did: string;
  originDefaultBranch: string;
  projectInfo?: object;
}) => {
  const dirs = getResourcePackageAssistantsDirs();
  const project = `${findProjectId}.yaml`;

  const files = dirs
    .map((dir) => {
      const root = dir.path;
      try {
        const folderPath = join(root, folder);

        return {
          path: (readdirSync(folderPath) || [])
            .filter((filename) => filename.endsWith('.yaml'))
            .map((filename) => join(folderPath, filename)),
          did: dir.did,
        };
      } catch (error) {
        console.error(error);
        return null;
      }
    })
    .filter(Boolean);

  let filePath = '';
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (file && (file?.path || []).find((filename) => filename.endsWith(project))) {
      filePath = file.path.find((filename) => filename.endsWith(project)) as string;
      break;
    }
  }

  mkdirSync(repositoryRoot(newProjectId), { recursive: true });
  const repository = await getRepository({ projectId: newProjectId });
  const working = await repository.working({ ref: originDefaultBranch });

  if (filePath) {
    const root = dirname(repository.root);
    const json = parse(readFileSync(filePath).toString());
    const assistants = uniqBy(json?.assistants || [], 'id') as any;

    for (const { parent, ...file } of assistants) {
      // 保存prompt文件
      const filename = `${file.name || 'Unnamed'}.${file.id}.yaml`;
      const newFilepath = join(root, newProjectId, parent.join('/'), filename);
      mkdirSync(join(root, newProjectId, parent.join('/')), { recursive: true });
      const result = stringify(file);
      writeFileSync(newFilepath, result);

      // 保存.cooperative
      working.syncedStore.files[file.id] = fileToYjs({ ...file });
      working.syncedStore.tree[file.id] = parent.concat(`${file.id}.yaml`).join('/');
    }

    working.save({ flush: true });

    const info = { ...(json?.project || {}), ...projectInfo };
    if (projectInfo && json?.project) {
      if (!(await Project.findOne({ where: { _id: info._id } }))) await Project.create(info);
    }
  }
};

export const getResourceProjects = (folder: string) => {
  const dirs = getResourcePackageAssistantsDirs();

  const files = dirs.map((dir) => {
    const folderPath = join(dir.path, folder);

    return {
      paths: (readdirSync(folderPath) || [])
        .filter((filename) => filename.endsWith('.yaml'))
        .map((filename) => join(folderPath, filename)),
      did: dir.did,
    };
  });

  const projects = files.flatMap(({ paths }) => {
    if (!paths?.length) return null;

    return paths.flatMap((filepath) => {
      try {
        const json = parse(readFileSync(filepath).toString());
        if (json.project) {
          delete json.project.projectType;

          return json.project;
        }

        return null;
      } catch (error) {
        console.error('yaml parse assistants resource file error', error);
        return null;
      }
    });
  });

  return projects.filter(Boolean);
};
