import { ImageAssistant, parseDirectives } from '../../types';
import { AgentExecutorBase } from './base';

export class AIGCAgentExecutor extends AgentExecutorBase<ImageAssistant> {
  override async process({ inputs }: { inputs: { [key: string]: any } }) {
    const { agent } = this;

    if (!agent.prompt?.length) throw new Error('Prompt cannot be empty');

    const prompt = await this.renderMessage(
      agent.prompt
        .split('\n')
        .filter((i) => !i.startsWith('//'))
        .join('\n')
    );

    const usedParameterKeys = new Set(
      parseDirectives(agent.prompt)
        .filter((i) => i.type === 'variable')
        .map((i) => i.name)
    );

    const usedImageParameterKeys = Array.from(usedParameterKeys).filter((key) => {
      const param = (agent.parameters ?? []).find((p) => p.key === key);
      return param?.type === 'image';
    });

    const usedImageParameterValues = usedImageParameterKeys.map((i) => inputs[i]).filter(Boolean);

    let promptWithoutImageValues = prompt;
    usedImageParameterValues.forEach((value, index) => {
      promptWithoutImageValues = promptWithoutImageValues.replace(value, `image-${index + 1}`);
    });

    const { data } = await this.context.callAIImage({
      assistant: agent,
      input: {
        prompt: promptWithoutImageValues,
        image: usedImageParameterValues,
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
