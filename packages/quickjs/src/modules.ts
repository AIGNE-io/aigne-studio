import { readFileSync } from 'fs';
import { basename, dirname, extname, join } from 'path';

import { glob } from 'glob';
import ts from 'typescript';

const srcModules = join(__dirname, '../modules');
const files = await glob('./**/*{.ts,.js}', { cwd: srcModules, ignore: ['*.d.ts'] });

export default Object.fromEntries(
  files.map((file) => {
    const src = readFileSync(join(srcModules, file)).toString();

    const path = join(dirname(file), basename(file, extname(file)));

    if (path.endsWith('.min')) return [path.replace(/\.min$/, ''), src];

    return [
      path,
      ts.transpileModule(src, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
    ];
  })
);
