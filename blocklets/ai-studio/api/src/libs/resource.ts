import { access, readFile, readdir, stat } from 'fs/promises';
import { basename, dirname, join } from 'path';

import { Assistant, ConfigFile, ProjectSettings, Variable, projectSettingsSchema } from '@blocklet/ai-runtime/types';
import { getResources } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { exists } from 'fs-extra';
import { groupBy } from 'lodash';
import { parse } from 'yaml';

import logger from './logger';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export type ResourceType =
  | 'template'
  | 'example'
  | 'application'
  | 'tool'
  | 'llm-adapter'
  | 'aigc-adapter'
  | 'knowledge';

export const ResourceTypes: ResourceType[] = [
  'application',
  'tool',
  'llm-adapter',
  'aigc-adapter',
  'template',
  'example',
  'knowledge',
];

interface ResourceProject {
  blocklet: { did: string };
  project: ProjectSettings;
  memory?: { variables: Variable[] };
  config?: ConfigFile;
  gitLogoPath?: string;
  assistants: (Assistant & { public?: boolean; parent: string[] })[];
}

interface Resources {
  [folder: string]: {
    projects: ResourceProject[];
    blockletMap: {
      [blockletDid: string]: {
        projectMap: {
          [projectId: string]: ResourceProject & {
            assistantMap: {
              [assistantId: string]: Assistant;
            };
          };
        };
      };
    };
  };
}

const cache: {
  resources?: Resources;
  promise?: Promise<Resources>;
} = {};

const getResourceDirs = () => {
  const resources = ResourceTypes.flatMap((type) =>
    getResources({
      types: [{ did: AI_STUDIO_DID, type }],
      skipRunningCheck: true,
    })
  );

  return resources
    .filter((x): x is typeof x & Required<Pick<typeof x, 'path'>> => !!x.path)
    .map((i) => ({
      ...i,
      type: basename(i.path),
    }));
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
          const json: ResourceProject = parse((await readFile(filepath)).toString());
          json.project = await projectSettingsSchema.validateAsync(json.project);

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
  const dirs = getResourceDirs().filter((i) => i.type !== 'knowledge');

  const groups = groupBy(
    await Promise.all(
      dirs.map(async (item) => {
        const projects = ((await loadResourceBlocklets(item.path)) ?? []).map((i) => ({
          ...i,
          config: i.config,
          blocklet: { did: item.did },
        }));

        const blockletMap = Object.fromEntries(
          Object.entries(groupBy(projects, (i) => i.blocklet.did)).map(([blockletDid, projects]) => [
            blockletDid,
            {
              projectMap: Object.fromEntries(
                projects.map(
                  (i) =>
                    [
                      i.project.id,
                      {
                        ...i,
                        assistantMap: Object.fromEntries(i.assistants.map((j) => [j.id, j])),
                      },
                    ] as const
                )
              ),
            },
          ])
        );

        return { type: item.type, projects, blockletMap };
      })
    ),
    (i) => i.type
  );

  return Object.fromEntries(
    Object.entries(groups).map(
      ([type, group]) =>
        [
          type,
          {
            projects: group.flatMap((i) => i.projects),
            blockletMap: Object.assign({}, ...group.map((i) => i.blockletMap)),
          },
        ] as const
    )
  );
}

async function reloadResources() {
  cache.promise ??= loadResources();
  return cache.promise;
}

export const getResourceProjects = async (type: ResourceType) => {
  const resources = await reloadResources();
  return resources[type]?.projects ?? [];
};

export const getProjectFromResource = async ({
  blockletDid,
  projectId,
  type,
}: {
  blockletDid?: string;
  projectId: string;
  type?: ResourceType | ResourceType[];
}) => {
  const resources = await reloadResources();
  for (const t of type ? [type].flat() : ResourceTypes) {
    if (blockletDid) {
      const p = resources[t]?.blockletMap[blockletDid]?.projectMap[projectId];
      if (p) return p;
    } else {
      const p = resources[t]?.projects.find((i) => i.project.id === projectId);
      if (p) return p;
    }
  }
  return undefined;
};

export const getAssistantFromResourceBlocklet = async ({
  blockletDid,
  projectId,
  assistantId,
  type,
}: {
  blockletDid: string;
  projectId: string;
  assistantId: string;
  type: ResourceType | ResourceType[];
}) => {
  const resources = await reloadResources();
  for (const t of [type].flat()) {
    const blocklet = resources[t]?.blockletMap[blockletDid];
    const project = blocklet?.projectMap[projectId];
    const assistant = project?.assistantMap[assistantId];
    if (assistant) return { assistant, project: project.project, blocklet: { did: blockletDid } };
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
