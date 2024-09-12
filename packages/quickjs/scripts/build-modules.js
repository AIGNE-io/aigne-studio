#!/usr/bin/env node

const ts = require('typescript');
const { glob } = require('zx');
const { join, dirname, basename, extname } = require('path');
const { readFile, mkdir, writeFile } = require('fs/promises');

const srcModules = join(__dirname, '../modules');

(async () => {
  const files = await glob('./**/*{.ts,.js}', { cwd: srcModules, ignore: ['*.d.ts'] });

  const modules = [];

  for (const file of files) {
    const path = join(dirname(file), basename(file, extname(file)));
    const src = await readFile(join(srcModules, file), 'utf-8');

    if (path.endsWith('.min')) {
      modules.push([path.replace(/\.min$/, ''), src]);
    } else {
      const res = ts.transpileModule(src, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
        },
      });
      const code = res.outputText;
      modules.push([path, code]);
    }
  }

  const mergedCode = `export default ${JSON.stringify(Object.fromEntries(modules))}`;

  const formats = ['cjs', 'esm'];

  for (const format of formats) {
    const cjsDist = join(__dirname, '../lib', format, 'modules.js');
    await mkdir(dirname(cjsDist), { recursive: true });
    await writeFile(
      cjsDist,
      ts.transpileModule(mergedCode, {
        compilerOptions: {
          module: format === 'esm' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS,
          target: ts.ModuleKind.ESNext,
        },
      }).outputText
    );
  }
})();
