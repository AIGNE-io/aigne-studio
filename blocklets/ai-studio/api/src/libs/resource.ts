import { access, readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

import { projectTemplates } from '@api/templates/projects';
import { getResources } from '@blocklet/sdk/lib/component';
import { exists } from 'fs-extra';
import { parse } from 'yaml';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const getResourcePackageAssistantsDirs = () => {
  const resources = getResources({ types: [{ did: AI_STUDIO_DID, type: 'ai' }], skipRunningCheck: true });
  return resources.map((resource) => ({ path: resource.path!, did: resource.did! })).filter((x) => !!x.path);
};

export const getResourceProjects = async (folder: 'template' | 'example') => {
  const dirs = getResourcePackageAssistantsDirs();

  const files = (
    await Promise.all(
      dirs.map(async (item) => {
        const folderPath = join(item.path, folder);
        if (!(await exists(folderPath))) return null;

        const list = (await readdir(folderPath)) || [];

        const paths = list.map(async (filename: string) => {
          const dirPath = join(folderPath, filename);
          const filePath = join(dirPath, `${filename}.yaml`);

          try {
            const stats = await stat(dirPath);
            if (stats.isDirectory()) {
              try {
                await access(filePath);
                return filePath;
              } catch {
                // 文件夹存在，但是.yaml文件不存在，不做处理，将执行后续的文件存在性检查
              }
            }
            await access(dirPath);
            return dirPath;
          } catch (error) {
            return '';
          }
        });

        return {
          paths: (await Promise.all(paths))
            .filter((i): i is NonNullable<typeof i> => !!i)
            .filter((i) => i.endsWith('yaml')),
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

                  json.gitLogoPath = join(resourcePath, json.project._id, 'logo.png');
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
