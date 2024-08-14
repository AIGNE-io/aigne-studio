import { ImageAssistant } from '../../types';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase } from './base';

export class AIGCAgentExecutor extends AgentExecutorBase<ImageAssistant> {
  override async process({ inputs }: { inputs: { [key: string]: any } }) {
    const { agent } = this;

    if (!agent.prompt?.length) throw new Error('Prompt cannot be empty');

    const prompt = await renderMessage(
      agent.prompt
        .split('\n')
        .filter((i) => !i.startsWith('//'))
        .join('\n'),
      { ...inputs, ...this.globalContext }
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
