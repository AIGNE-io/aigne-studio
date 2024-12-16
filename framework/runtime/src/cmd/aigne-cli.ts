import { join } from 'path';

import { Command, program } from 'commander';
import { existsSync, writeFileSync } from 'fs-extra';

import { AIGNERuntime } from '../runtime';
import { generateWrapperCode } from './utils/generate-wrapper-code';

program
  .addCommand(
    new Command('gen-code')
      .requiredOption('-p, --project <string>', 'path to AIGNE project')
      .action(async ({ project }) => {
        if (typeof project !== 'string' || !existsSync(project)) {
          throw new Error(`Invalid project path: ${project}`);
        }
        (async () => {
          const runtime = await AIGNERuntime.load({ path: project });
          const files = await generateWrapperCode(runtime);
          for (const [filename, code] of Object.entries(files)) {
            writeFileSync(join(project, `${filename}.ts`), code);
          }
        })();
      })
  )
  .parse(process.argv);
