import { ImageAssistant } from '../../types';
import { AgentExecutorBase } from './base';

export class AIGCAgentExecutor extends AgentExecutorBase<ImageAssistant> {
  override async process() {
    const { agent } = this;

    if (!agent.prompt?.length) throw new Error('Prompt cannot be empty');

    const prompt = await this.renderMessage(
      agent.prompt
        .split('\n')
        .filter((i) => !i.startsWith('//'))
        .join('\n')
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
        outputFormat: agent.outputFormat as any,
        outputCompression: agent.outputCompression as any,
        background: agent.background as any,
        moderation: agent.moderation as any,
      },
    });

    return { $images: data };
  }
}
