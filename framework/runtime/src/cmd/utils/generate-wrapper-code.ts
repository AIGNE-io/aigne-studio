import { DataType, OrderedRecord, RunnableDefinition, isNonNullable } from '@aigne/core';

import { ProjectDefinition } from '../../runtime/runtime';
import { formatCode } from '../../utils/prettier';

export async function generateWrapperCode(project: ProjectDefinition) {
  const packageJson = JSON.stringify(
    {
      // TODO: 考虑中文和其他语言情况
      name: `@aigne-project/${(project.name || project.id).toLowerCase().replaceAll(/[^a-z0-9]/g, '_')}`,
      version: '0.0.1',
      main: 'index.cjs',
      module: 'index.js',
      types: 'index.ts',
      dependencies: {
        '@aigne/core': 'latest',
        '@aigne/runtime': 'latest',
      },
      exports: {
        '.': {
          require: './index.cjs',
          import: './index.js',
          types: './index.ts',
        },
        './middleware': {
          require: './middleware.cjs',
          import: './middleware.js',
          types: './middleware.ts',
        },
        './client': {
          require: './client.cjs',
          import: './client.js',
          types: './client.ts',
        },
      },
    },
    null,
    2
  );

  const index = `\
import { Runnable } from '@aigne/core';
import { Runtime, ProjectDefinition } from '@aigne/runtime';

const projectDefinition: ProjectDefinition = ${JSON.stringify(project, null, 2)};

${generateAgentsInterface(project.runnables, 'Runnable')}

export default new Runtime<Agents>(projectDefinition);
`;

  const middleware = `\
import { createMiddleware } from '@aigne/runtime/middleware';

export default function middleware() {
  return createMiddleware({ path: __dirname });
}
`;

  const client = `\
import { ProjectDefinition } from '@aigne/runtime';
import { Agent, Runtime } from '@aigne/runtime/client';

const projectDefinition: ProjectDefinition = ${JSON.stringify(sanitizeProjectDefinition(project), null, 2)};

${generateAgentsInterface(project.runnables, 'Agent')}

export default new Runtime<Agents>(projectDefinition);
`;

  const tsFiles = [
    { fileName: 'index.ts', content: index },
    { fileName: 'middleware.ts', content: middleware },
    { fileName: 'client.ts', content: client },
  ];

  const ts = await import('typescript');

  const result = (
    await Promise.all(
      tsFiles.map(async ({ fileName, content }) => {
        const cjs = ts.transpileModule(content, { fileName, compilerOptions: { module: ts.ModuleKind.CommonJS } });
        const esm = ts.transpileModule(content, { fileName, compilerOptions: { module: ts.ModuleKind.ESNext } });
        return [
          { fileName: fileName.replace(/\.ts$/, '.cjs'), content: await formatCode(cjs.outputText) },
          { fileName: fileName.replace(/\.ts$/, '.js'), content: await formatCode(esm.outputText) },
          { fileName: fileName.replace(/\.ts$/, '.ts'), content: await formatCode(content) },
        ];
      })
    )
  ).flat();

  return [...result, { fileName: 'package.json', content: packageJson }];
}

function sanitizeProjectDefinition(project: ProjectDefinition): ProjectDefinition {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    runnables: OrderedRecord.fromArray(
      OrderedRecord.map(project.runnables, (agent) => {
        return {
          type: agent.type,
          id: agent.id,
          name: agent.name,
          description: agent.description,
          inputs: agent.inputs,
          outputs: agent.outputs,
        };
      })
    ),
  };
}

function generateAgentsInterface(runnables: OrderedRecord<RunnableDefinition>, agentInterface: string) {
  return `\
interface Agents {
  ${OrderedRecord.map(runnables, (agent) => {
    // ignore agent without name
    if (!agent.name) return null;

    // TODO: 把 Agent 的类型定义单独放到一个 ts 文件中，然后在这里引入
    return `${JSON.stringify(agent.name)}: ${agentInterface}<${fieldsToTsType(agent.inputs)}, ${fieldsToTsType(agent.outputs)}>`;
  })
    .filter(isNonNullable)
    .join(';\n')}
}
`;
}

function fieldsToTsType(fields: OrderedRecord<DataType>) {
  // TODO: 最好采用 json schema 的定义方式，使用第三方库生成类型定义
  return `\
{
  ${OrderedRecord.map(
    fields,
    (input) => `${JSON.stringify(input.name || input.id)}${input.required ? '' : '?'}: ${dataTypeToTsType(input)}`
  ).join(';')}
}`;
}

function dataTypeToTsType(output: DataType) {
  if (output.type === 'array') return 'object[]';

  return output.type;
}
