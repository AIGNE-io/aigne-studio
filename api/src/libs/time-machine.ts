import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import TimeMachine from '@abtnode/timemachine';

import { Template } from '../store/templates';
import env from './env';

export const templateTimeMachineDir = (templateId: string) => join(env.dataDir, 'timemachine/templates', templateId);

export function initTemplateTimeMachine(templateId: string) {
  const dir = templateTimeMachineDir(templateId);
  const sourceDir = join(dir, 'sources');

  return new TimeMachine({
    sources: sourceDir,
    sourcesBase: sourceDir,
    targetDir: join(dir, '.git'),
  });
}

export async function writeTemplateToTimeMachine(template: Template, did: string): Promise<string> {
  const timeMachine = initTemplateTimeMachine(template._id!);

  const jsonPath = join(templateTimeMachineDir(template._id), 'sources/template.json');

  mkdirSync(dirname(jsonPath), { recursive: true });

  writeFileSync(jsonPath, JSON.stringify(template, null, 2));

  return timeMachine.takeSnapshot(template.versionNote || new Date(template.updatedAt).toISOString(), {
    name: did,
    email: did,
  });
}
