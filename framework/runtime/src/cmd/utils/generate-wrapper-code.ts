import { AIGNERuntime } from '../../runtime/runtime';

export async function generateWrapperCode(runtime: AIGNERuntime) {
  runtime.project.agents?.map((agent) => agent.name);

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

  return { index, middleware, client };
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
