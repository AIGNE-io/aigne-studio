import { ImageAssistant, parseDirectives } from '../../types';
import { AgentExecutorBase } from './base';

export class AIGCAgentExecutor extends AgentExecutorBase<ImageAssistant> {
  override async process({ inputs }: { inputs: { [key: string]: any } }) {
    const { agent } = this;

    if (!agent.prompt?.length) throw new Error('Prompt cannot be empty');

    const usedParameterKeys = new Set(
      parseDirectives(agent.prompt)
        .filter((i) => i.type === 'variable')
        .map((i) => i.name)
    );

    const usedImageParameterKeys = Array.from(usedParameterKeys).filter((key) => {
      const param = (agent.parameters ?? []).find((p) => p.key === key);
      return param?.type === 'image';
    });

    const imageKeyMap = generateImageKeyMap(usedImageParameterKeys, inputs);

    const prompt = await this.renderMessage(
      agent.prompt
        .split('\n')
        .filter((i) => !i.startsWith('//'))
        .join('\n'),
      { ...inputs, ...this.globalContext, ...imageKeyMap }
    );

    const usedImageParameterValues = usedImageParameterKeys.reduce((acc, key) => {
      const value = inputs[key];
      if (!value) return acc;

      if (Array.isArray(value)) acc.push(...value);
      else acc.push(value);
      return acc;
    }, [] as string[]);

    const { data } = await this.context.callAIImage({
      assistant: agent,
      input: {
        prompt,
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

function generateImageKeyMap(usedParameterKeys: Array<string>, inputs: Record<string, any>): Record<string, string> {
  let count = 1;
  const result: Record<string, string> = {};

  for (const key of usedParameterKeys) {
    const value = inputs[key];
    if (!value) continue;
    if (typeof value === 'string') {
      result[key] = `{key: ${key}, images: image-${count++}}`;
    } else if (Array.isArray(value) && value.length) {
      result[key] = `{key: ${key}, images: ${value.map(() => `image-${count++}`).join(',')}}`;
    }
  }
  return result;
}
