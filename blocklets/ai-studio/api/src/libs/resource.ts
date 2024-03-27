import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

import { projectTemplates } from '@api/templates/projects';
import { getResources } from '@blocklet/sdk/lib/component';
import { exists } from 'fs-extra';
import { parse } from 'yaml';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const getResourcePackageAssistantsDirs = () => {
  const resources = getResources({ types: [{ did: AI_STUDIO_DID, type: 'ai' }] });
  return resources.map((resource) => ({ path: resource.path!, did: resource.did! })).filter((x) => !!x.path);
};

export const getResourceProjects = async (folder: 'template' | 'example') => {
  const dirs = getResourcePackageAssistantsDirs();

  const files = (
    await Promise.all(
      dirs.map(async (item) => {
        const folderPath = join(item.path, folder);
        if (!(await exists(folderPath))) return null;

        return {
          paths: ((await readdir(folderPath)) || [])
            .filter((filename) => filename.endsWith('.yaml'))
            .map((filename) => join(folderPath, filename)),
          did: item.did,
          resourcePath: folderPath,
        };
      })
    )
  ).filter((i): i is NonNullable<typeof i> => !!i);

  const projects = (
    await Promise.all(
      files.map(async ({ paths, resourcePath }) => {
        return (
          await Promise.all(
            paths.map(async (filepath) => {
              try {
                const json: (typeof projectTemplates)[number] = parse((await readFile(filepath)).toString());
                if (json.project) {
                  delete json?.project?.projectType;

                  json.gitLogoPath = join(resourcePath, `/icons/${json.project._id}.png`);
                }

                return json;
              } catch (error) {
                console.error('parse assistants resource file error', error);
                return null;
              }
            })
          )
        ).flat();
      })
    )
  )
    .flat()
    .filter((i): i is NonNullable<typeof i> => !!i);

  return projects;
};
