import { callBlockletApi } from '@blocklet/dataset-sdk/request';

import { GetAgentResult } from '../assistant/type';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

// 未用上，先保留
export function getArrayOrObjectParameters(apiSpec: any) {
  const arrayParams: string[] = [];

  // 检查parameters
  if (apiSpec.parameters) {
    apiSpec.parameters.forEach((param: any) => {
      if (param.schema && ['array', 'object'].includes(param.schema.type)) {
        arrayParams.push(param.name);
      }
    });
  }

  // 检查requestBody
  if (apiSpec.requestBody && apiSpec.requestBody?.content) {
    try {
      const { schema } = apiSpec.requestBody.content['application/json'];

      // eslint-disable-next-line no-inner-declarations
      function traverseSchema(schema: any) {
        if (schema.type === 'object' && schema.properties) {
          Object.entries(schema.properties).forEach(([key, value]: any) => {
            if (['array', 'object'].includes(value.type)) {
              arrayParams.push(key);
            }
          });
        }
      }

      traverseSchema(schema);
    } catch (error) {
      console.error('Failed to parse requestBody schema', error);
    }
  }

  return arrayParams;
}

export class BlockletAgentExecutor extends AgentExecutorBase {
  override async process(agent: GetAgentResult, { inputs }: AgentExecutorOptions) {
    const blocklet = await this.context.getBlockletAgent(agent.id);

    if (!blocklet.agent) {
      throw new Error('Blocklet agent api not found.');
    }

    if (!blocklet.agent.openApi) {
      throw new Error('Blocklet agent api not found.');
    }

    const params: { [key: string]: string } = {
      userId: this.context.user?.did || '',
      projectId: this.context.entryProjectId,
      sessionId: this.context.sessionId,
      assistantId: agent.id || '',
    };

    const response = await callBlockletApi(blocklet.agent.openApi, inputs || {}, { user: this.context.user, params });

    return response.data;
  }
}
