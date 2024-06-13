import { ImageAssistant } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class AIGCAgentExecutor extends AgentExecutorBase {
  override async process(agent: ImageAssistant & GetAgentResult, { inputs }: AgentExecutorOptions) {
    if (!agent.prompt?.length) throw new Error('Prompt cannot be empty');

    const prompt = await renderMessage(
      agent.prompt
        .split('\n')
        .filter((i) => !i.startsWith('//'))
        .join('\n'),
      inputs
    );

    const { data } = await this.context.callAIImage({
      assistant: agent,
      input: {
        prompt,
        n: agent.n,
        model: agent.model,
        quality: agent.quality as any,
        size: agent.size as any,
        style: agent.style as any,
      },
    });

    return { $images: data };
  }
}
