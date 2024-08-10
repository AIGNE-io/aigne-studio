import { isPromptAssistant, isPromptMessage } from '../utils';
import { AssistantYjs, ImageAssistantYjs, PromptAssistantYjs } from '../yjs';
import Mustache from './mustache';

type Directive = {
  type: 'variable';
  name: string;
};

export function parseDirectives(...content: string[]): Directive[] {
  return content.flatMap((content) => {
    // 捕获 api/{{var/api/task/{{list}} 这种错误
    try {
      const spans = Mustache.parse(content);

      const directives: Directive[] = [];

      for (const span of spans) {
        switch (span[0]) {
          case 'name': {
            const name = span[1];
            if (name) directives.push({ type: 'variable', name });
            break;
          }
          case 'text': {
            break;
          }
          default:
            console.warn('Unknown directive', span);
        }
      }

      return directives;
    } catch (error) {
      return [];
    }
  });
}

export function parseDirectivesOfTemplate(assistant: PromptAssistantYjs | ImageAssistantYjs) {
  return parseDirectives(
    ...(isPromptAssistant(assistant)
      ? Object.values(assistant.prompts ?? {}).map((i) => (isPromptMessage(i.data) ? i.data.data.content : undefined))
      : [assistant.prompt]
    ).filter((i): i is string => typeof i === 'string')
  );
}

export function parseDirectivesOfTemplateInput(assistant: AssistantYjs) {
  const agentParameters = Object.values(assistant.parameters ?? {})
    .map((i) => i.data)
    .filter((i) => i.type === 'source');

  const directives = agentParameters
    .flatMap((i) => {
      if (i.type === 'source' && i.source?.variableFrom === 'tool') {
        return Object.values(i.source.agent?.parameters || {});
      }

      if (i.type === 'source' && i.source?.variableFrom === 'knowledge') {
        return Object.values(i.source.knowledge?.parameters || {});
      }

      if (i.type === 'source' && i.source?.variableFrom === 'blockletAPI') {
        return Object.values(i.source.api?.parameters || {});
      }

      return [];
    })
    .filter((i): i is string => typeof i === 'string');

  return parseDirectives(...directives);
}
