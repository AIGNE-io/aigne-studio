import { isPromptMessage } from '../utils';
import { PromptFileYjs } from '../yjs';
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

export function parseDirectivesOfTemplate(assistant: PromptFileYjs) {
  return parseDirectives(
    ...Object.values(assistant.prompts ?? {})
      .flatMap(({ data }) => {
        return isPromptMessage(data) ? data.data.content : undefined;
      })
      .filter((i): i is string => typeof i === 'string')
  );
}
