/* eslint-disable no-console */
import Joi from 'joi';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';
// eslint-disable-next-line import/no-extraneous-dependencies
import { $, chalk, fs, path } from 'zx';

function buildReactComponentPlugin({
  title,
  description,
  files,
}: {
  title: string;
  description: string;
  files: {
    name: string;
    description?: string;
    tags?: string[];
    parameter?: {
      [key: string]: any;
    };
    path: string;
  }[];
}): any {
  const currentDir = __dirname;

  const viteInputSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    files: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        path: Joi.string().required(),
        description: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        parameter: Joi.object({}).optional(),
      })
    ),
  }).unknown(true);

  const blockletSchema = Joi.object({
    name: Joi.string().required(),
    did: Joi.string().required(),
  }).required();

  const viteOutputSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    version: Joi.string().required(),
    type: Joi.string().valid('react-component-protocol').required(),
    blocklet: blockletSchema,
    components: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        url: Joi.string().required(),
        description: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        parameter: Joi.object({}).optional(),
      })
    ),
  }).unknown(true);

  return {
    name: 'react-to-mjs',
    apply: 'build',
    async buildStart() {
      await viteInputSchema.validateAsync({ title, description, files }, { stripUnknown: true });
      const viteConfigFile = 'vite.config.tmp.mts';
      await $`find ${path.resolve(currentDir, 'public')} -type f -name '*.es.mjs' -exec rm {} +`;
      const list = [];

      // 执行多次 Vite 打包
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i]?.path;
        console.log(chalk.greenBright(`[info]: Executing file ${filePath}`));
        if (!filePath) {
          throw new Error('File path is not provided.');
        }
        const file = path.basename(filePath);
        const name = (file || '').split('.')[0];
        if (!name) {
          throw new Error('Invalid file name.');
        }
        console.log(chalk.greenBright(`[info]: Executing Vite build ${file}`));

        // 更新 Vite 配置文件
        await fs.writeFile(
          viteConfigFile,
          `\
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import externalGlobals from 'rollup-plugin-external-globals';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      externalGlobals({ react: 'React' }),
      viteStaticCopy({
        targets: [{ src: 'dist/${name}.es.mjs', dest: '../public' }],
      }),
    ],
    build: {
      lib: {
        entry: '${filePath}',
        formats: ['es'],
        fileName: (format) => \`[name].\${format}.mjs\`,
      },
    },
  };
});
`
        );

        // 执行 Vite 打包命令
        await $`vite build --config ${viteConfigFile}`;
        await $`rm ${path.resolve(currentDir, viteConfigFile)}`;

        list.push({
          name: files[i]?.name,
          url: joinURL('/', `${name}.es.mjs`),
          description: files[i]?.description,
          tags: files[i]?.tags,
          parameter: files[i]?.parameter,
        });

        console.log(chalk.greenBright(`[info]: Vite build ${file} completed`));
      }

      const blocklet = parse((await fs.readFile(path.resolve(currentDir, 'blocklet.yml'))).toString());
      try {
        await blockletSchema.validateAsync(blocklet, { stripUnknown: true });
      } catch (error) {
        throw new Error('blocklet.yml not found name or did key');
      }

      const output = await viteOutputSchema.validateAsync(
        {
          title,
          description,
          version: '1.0.0',
          type: 'react-component-protocol',
          blocklet: {
            name: blocklet.name,
            did: blocklet.did,
          },
          components: list,
        },
        { stripUnknown: true }
      );

      await fs.writeFile(path.resolve(currentDir, 'component.yml'), stringify(output));
      console.log(chalk.greenBright('All Vite builds completed'));
    },
  };
}

export default buildReactComponentPlugin;
