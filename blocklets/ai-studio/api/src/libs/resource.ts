import { access, readFile, readdir, stat } from 'fs/promises';
import { dirname, join } from 'path';

import Project from '@api/store/models/project';
import { projectTemplates } from '@api/templates/projects';
import { Assistant } from '@blocklet/ai-runtime/types';
import { getResources } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { exists } from 'fs-extra';
import { parse } from 'yaml';

import logger from './logger';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export type ResourceType = 'template' | 'example' | 'application' | 'tool';

const ResourceTypes: ResourceType[] = ['template', 'example', 'application', 'tool'];

interface ResourceProject {
  blocklet: { did: string };
  project: Project['dataValues'];
  gitLogoPath?: string;
  assistants: (Assistant & { parent: string[] })[];
}

interface Resources {
  [folder: string]: {
    projects: ResourceProject[];
    projectMap: {
      [projectId: string]: ResourceProject & {
        assistantMap: {
          [assistantId: string]: Assistant;
        };
      };
    };
  };
}

const cache: {
  resources?: Resources;
  promise?: Promise<Resources>;
} = {};

const getResourcePackageAssistantsDirs = () => {
  const resources = getResources({ types: [{ did: AI_STUDIO_DID, type: 'ai' }], skipRunningCheck: true });
  return resources.map((resource) => ({ path: resource.path!, did: resource.did! })).filter((x) => !!x.path);
};

async function loadResourceBlocklets(path: string) {
  if (!(await exists(path))) return null;

  const paths = (
    await Promise.all(
      (await readdir(path)).map(async (filename: string) => {
        const dirPath = join(path, filename);
        const filePath = join(dirPath, `${filename}.yaml`);

        try {
          const stats = await stat(dirPath);
          if (stats.isDirectory()) {
            await access(filePath);
            return filePath;
          }
        } catch (error) {
          logger.error('read resource blocklet error', { error });
        }

        return null;
      })
    )
  ).filter((i): i is NonNullable<typeof i> => !!i);

  return (
    await Promise.all(
      paths.map(async (filepath) => {
        try {
          const json: (typeof projectTemplates)[number] = parse((await readFile(filepath)).toString());
          delete json?.project?.projectType;

          const gitLogoPath = join(dirname(filepath), 'logo.png');
          if (await exists(gitLogoPath)) {
            json.gitLogoPath = gitLogoPath;
          }

          return json;
        } catch (error) {
          logger.error('parse assistants resource file error', { error });
          return null;
        }
      })
    )
  ).filter((i): i is NonNullable<typeof i> => !!i);
}

async function loadResources(): Promise<Resources> {
  const dirs = getResourcePackageAssistantsDirs();

  const files = await Promise.all(
    ResourceTypes.map(async (folder) => {
      const projects: Resources[string]['projects'] = (
        await Promise.all(
          dirs.map(async (item) => {
            const folderPath = join(item.path, folder);
            const projects = (await loadResourceBlocklets(folderPath)) ?? [];
            return projects.map((i) => ({
              ...i,
              blocklet: { did: item.did },
            }));
          })
        )
      ).flat();

      return [
        folder,
        {
          projects,
          projectMap: Object.fromEntries(
            projects.map(
              (i) =>
                [
                  i.project._id,
                  {
                    ...i,
                    assistantMap: Object.fromEntries(i.assistants.map((j) => [j.id, j])),
                  },
                ] as const
            )
          ),
        },
      ] as const;
    })
  );

  return Object.fromEntries(files);
}

async function reloadResources() {
  cache.promise ??= loadResources();
  return cache.promise;
}

export const getResourceProjects = async (type: ResourceType) => {
  const resources = await reloadResources();
  return resources[type]?.projects ?? [];
};

export const getAssistantFromResourceBlocklet = async ({
  projectId,
  assistantId,
  type,
}: {
  projectId: string;
  assistantId: string;
  type: ResourceType | ResourceType[];
}) => {
  const resources = await reloadResources();
  for (const t of [type].flat()) {
    const assistant = resources[t]?.projectMap[projectId]?.assistantMap[assistantId];
    if (assistant) return assistant;
  }

  return undefined;
};

export function initResourceStates() {
  async function reloadStatesWithCatch() {
    cache.promise = undefined;

    await reloadResources().catch((error) => {
      logger.error('load resource states error', { error });
    });
  }

  reloadStatesWithCatch();

  config.events.on(config.Events.componentAdded, reloadStatesWithCatch);
  config.events.on(config.Events.componentRemoved, reloadStatesWithCatch);
  config.events.on(config.Events.componentStarted, reloadStatesWithCatch);
  config.events.on(config.Events.componentStopped, reloadStatesWithCatch);
  config.events.on(config.Events.componentUpdated, reloadStatesWithCatch);
}
