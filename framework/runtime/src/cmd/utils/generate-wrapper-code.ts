import { AIGNERuntime } from '../../runtime/runtime';

export async function generateWrapperCode(runtime: AIGNERuntime) {
  runtime.project.agents?.map((agent) => agent.name);

  const packageJson = JSON.stringify(
    {
      name: `@aigne-project/${(runtime.name || runtime.id).toLowerCase().replaceAll(/[^a-z0-9]/g, '_')}`,
      version: '0.0.1',
      main: 'index.cjs',
      module: 'index.js',
      types: 'index.d.ts',
      dependencies: { '@aigne/runtime': 'latest' },
      exports: {
        '.': {
          require: './index.cjs',
          import: './index.js',
          types: './index.d.ts',
        },
        './middleware': {
          require: './middleware.cjs',
          import: './middleware.js',
          types: './middleware.d.ts',
        },
        './client': {
          require: './client.cjs',
          import: './client.js',
          types: './client.d.ts',
        },
      },
    },
    null,
    2
  );

  const index = `\
import { AIGNERuntime, Agent } from '@aigne/runtime';

const runtime = AIGNERuntime.load({ path: __dirname });

export default {
  agents: {
  ${(runtime.project.agents ?? [])
    ?.map((agent) => [
      // TODO: 把 Agent 的类型定义单独放到一个 ts 文件中，然后在这里引入
      `${JSON.stringify(agent.name || agent.id)}: new Agent<${generateAgentInputTypeDefine(agent)}, ${generateAgentOutputTypeDefine(agent)}>(runtime.then(r => r.project), ${JSON.stringify(agent.id)})`,
    ])
    .join(',\n')}
  }
}
`;

  const middleware = `\
import { createMiddleware } from '@aigne/runtime/middleware';

export default function middleware() {
  return createMiddleware({ path: __dirname });
}
`;

  const client = `\
import { Agent } from '@aigne/runtime/client';

export default {
  agents: {
    ${(runtime.project.agents ?? [])
      ?.map((agent) => [
        // TODO: 把 Agent 的类型定义单独放到一个 ts 文件中，然后在这里引入
        `${JSON.stringify(agent.name || agent.id)}: new Agent<${generateAgentInputTypeDefine(agent)}, ${generateAgentOutputTypeDefine(agent)}>(${JSON.stringify(runtime.id)}, ${JSON.stringify(agent.id)})`,
      ])
      .join(',\n')}
  }
}
`;

  const tsFiles = [
    { fileName: 'index.ts', content: index },
    { fileName: 'middleware.ts', content: middleware },
    { fileName: 'client.ts', content: client },
  ];

  const ts = await import('typescript');

  const result = (
    await Promise.all(
      tsFiles.map(({ fileName, content }) => {
        const cjs = ts.transpileModule(content, { fileName, compilerOptions: { module: ts.ModuleKind.CommonJS } });
        const esm = ts.transpileModule(content, { fileName, compilerOptions: { module: ts.ModuleKind.ESNext } });
        return [
          { fileName: fileName.replace(/\.ts$/, '.cjs'), content: cjs.outputText },
          { fileName: fileName.replace(/\.ts$/, '.js'), content: esm.outputText },
          { fileName: fileName.replace(/\.ts$/, '.d.ts'), content },
        ];
      })
    )
  ).flat();

  return [...result, { fileName: 'package.json', content: packageJson }];
}

type InternalAgent = NonNullable<AIGNERuntime['project']['agents']>[number];

function generateAgentInputTypeDefine(agent: InternalAgent) {
  // TODO: 最好采用 json schema 的定义方式，使用第三方库生成类型定义
  return `\
{
  ${agent.parameters
    ?.map((input) => [input.key || input.id, inputTypeToTypeScriptType(input)])
    .filter(([, type]) => !!type)
    .map(([field, type]) => `${JSON.stringify(field)}: ${type}`)
    .join(';')}
}`;
}

function inputTypeToTypeScriptType(input: NonNullable<InternalAgent['parameters']>[number]) {
  if (!input.type) return 'string';
  if (['string', 'number', 'boolean'].includes(input.type)) return input.type;
  if (input.type === 'select') return 'string';
  if (input.type === 'language') return 'string';
  if (input.type === 'image') return 'string';
  if (input.type === 'verify_vc') return 'object';
  return undefined;
}

function generateAgentOutputTypeDefine(agent: InternalAgent) {
  // TODO: 最好采用 json schema 的定义方式，使用第三方库生成类型定义
  return `\
{
  ${agent.outputVariables
    ?.map((output) => [output.name || output.id, outputTypeToTypeScriptType(output)])
    .filter(([, type]) => !!type)
    .map(([field, type]) => `${JSON.stringify(field)}: ${type}`)
    .join(';')}
}`;
}

function outputTypeToTypeScriptType(output: NonNullable<InternalAgent['outputVariables']>[number]) {
  if (output.type && ['string', 'number', 'boolean', 'object'].includes(output.type)) return output.type;
  if (output.type === 'array') return 'object[]';
  if (!output.type) return 'object';
  return undefined;
}
