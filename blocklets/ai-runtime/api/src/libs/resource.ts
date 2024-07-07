import { access, readFile, readdir, stat } from 'fs/promises';
import { basename, dirname, join } from 'path';

import DatasetContent from '@api/store/models/dataset/content';
import Dataset from '@api/store/models/dataset/dataset';
import DatasetDocument from '@api/store/models/dataset/document';
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
  'knowledge',
  'template',
  'example',
];

interface ResourceProject {
  blocklet: { did: string };
  project: ProjectSettings;
  memory?: { variables: Variable[] };
  config?: ConfigFile;
  projectDir: string;
  assistants: (Assistant & { public?: boolean; parent: string[] })[];
}

interface Resources {
  knowledge: {
    knowledgeList: ResourceKnowledge[];
    blockletMap: {
      [blockletDid: string]: {
        knowledgeMap: {
          [knowledgeId: string]: ResourceKnowledge;
        };
      };
    };
  };
  agents: {
    [folder: string]: {
      projects: ResourceProject[];
      blockletMap: {
        [blockletDid: string]: {
          projectMap: {
            [projectId: string]: ResourceProject & {
              agentMap: {
                [assistantId: string]: Assistant;
              };
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
          json.projectDir = dirname(filepath);
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
                        agentMap: Object.fromEntries(i.assistants.map((j) => [j.id, j])),
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

  const knowledgeList = await loadResourceKnowledge();

  return {
    knowledge: {
      knowledgeList,
      blockletMap: Object.fromEntries(
        Object.entries(groupBy(knowledgeList, (i) => i.blockletDid)).map(([blockletDid, kbs]) => [
          blockletDid,
          { knowledgeMap: Object.fromEntries(kbs.map((i) => [i.knowledge.id, i])) },
        ])
      ),
    },
    agents: Object.fromEntries(
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
    ),
  };
}

const loadResourceKnowledge = async () => {
  const dirs = getResourceDirs().filter((i) => i.type === 'knowledge');

  if (dirs.length === 0) return [];

  return (
    await Promise.all(
      dirs.map(async (item) => {
        try {
          if (!(await exists(item.path))) return undefined;
          const knowledgeIds = await readdir(item.path);
          if (!knowledgeIds.length) return undefined;

          return await Promise.all(
            knowledgeIds.map(async (knowledgeId) => {
              try {
                const knowledgePath = join(item.path, knowledgeId);
                const vectorsPath = join(knowledgePath, 'vectors');
                const uploadPath = join(knowledgePath, 'uploads');

                const knowledgeJsonPath = join(knowledgePath, 'knowledge.yaml');
                const knowledge: Dataset['dataValues'] & { public?: boolean } = parse(
                  (await readFile(knowledgeJsonPath)).toString()
                );

                const documentsPath = join(knowledgePath, 'documents.yaml');
                const documents = parse((await readFile(documentsPath)).toString());

                const contentsPath = join(knowledgePath, 'contents.yaml');
                const contents = parse((await readFile(contentsPath)).toString());

                return {
                  knowledge,
                  blockletDid: item.did,
                  vectorsPath,
                  uploadPath,
                  documents,
                  contents,
                };
              } catch (error) {
                logger.error('read knowledge resource error', { error });
              }
              return undefined;
            })
          );
        } catch (error) {
          logger.error('read knowledge resource error', { error });
        }

        return undefined;
      })
    )
  )
    .flat()
    .filter((i): i is NonNullable<typeof i> => !!i);
};

async function initResources({ reload }: { reload?: boolean } = {}) {
  if (reload) cache.promise = undefined;
  cache.promise ??= loadResources();
  return cache.promise;
}

export const getResourceProjects = async ({ blockletDid, type }: { blockletDid?: string; type: ResourceType }) => {
  const resources = await initResources();
  const list = resources.agents[type]?.projects ?? [];

  if (blockletDid) {
    return list.filter((i) => i.blocklet.did === blockletDid);
  }

  return list;
};

export interface ResourceKnowledge {
  knowledge: Dataset['dataValues'] & { public?: boolean };
  blockletDid: string;
  documents: DatasetDocument['dataValues'][];
  contents: DatasetContent['dataValues'][];
  vectorsPath: string;
  uploadPath: string;
}

export const getResourceKnowledgeList = async () => {
  const resources = await initResources();
  return resources.knowledge.knowledgeList;
};

export const getResourceKnowledgeWithData = async ({
  blockletDid,
  knowledgeId,
}: {
  blockletDid: string;
  knowledgeId: string;
}) => {
  const resources = await initResources();
  return resources.knowledge.blockletMap[blockletDid]?.knowledgeMap[knowledgeId];
};

export const getProjectFromResource = async ({
  blockletDid,
  projectId,
  type,
}: {
  blockletDid: string;
  projectId: string;
  type?: ResourceType | ResourceType[];
}) => {
  const resources = await initResources();
  for (const t of type ? [type].flat() : ResourceTypes) {
    const p = resources.agents[t]?.blockletMap[blockletDid]?.projectMap[projectId];
    if (p) return p;
  }
  return undefined;
};

export const getMemoryVariablesFromResource = async ({
  blockletDid,
  projectId,
  type,
}: {
  blockletDid: string;
  projectId: string;
  type?: ResourceType | ResourceType[];
}) => {
  const resources = await initResources();
  for (const t of type ? [type].flat() : ResourceTypes) {
    const p = resources.agents[t]?.blockletMap[blockletDid]?.projectMap[projectId];
    if (p) return p.memory?.variables;
  }
  return undefined;
};

export const getAssistantFromResourceBlocklet = async ({
  blockletDid,
  projectId,
  agentId,
  type = ResourceTypes,
}: {
  blockletDid: string;
  projectId: string;
  agentId: string;
  type?: ResourceType | ResourceType[];
}) => {
  const resources = await initResources();
  for (const t of [type].flat()) {
    const blocklet = resources.agents[t]?.blockletMap[blockletDid];
    const project = blocklet?.projectMap[projectId];
    const agent = project?.agentMap[agentId];
    if (agent) return { agent, project: project.project, blocklet: { did: blockletDid } };
  }

  return undefined;
};

export function initResourceStates() {
  async function reloadStatesWithCatch() {
    logger.info('reload resource states');
    await initResources({ reload: true })
      .then((resource) => {
        logger.info('reload resource states success', {
          projects: Object.values(resource.agents).reduce((res, i) => i.projects.length + res, 0),
          knowledge: resource.knowledge.knowledgeList.length,
        });
      })
      .catch((error) => {
        logger.error('reload resource states error', { error });
      });
  }

  reloadStatesWithCatch();

  config.events.on(config.Events.componentAdded, reloadStatesWithCatch);
  config.events.on(config.Events.componentRemoved, reloadStatesWithCatch);
  config.events.on(config.Events.componentStarted, reloadStatesWithCatch);
  config.events.on(config.Events.componentStopped, reloadStatesWithCatch);
  config.events.on(config.Events.componentUpdated, reloadStatesWithCatch);
}
