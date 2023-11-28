import toPath from 'lodash/toPath';

import Mustache from './mustache';
import { Template, isCallAPIMessage, isCallDatasetMessage, isCallPromptMessage, isPromptMessage } from '..';

type Directive = {
  type: 'variable';
  name: string;
};

export function parseDirectives(...content: string[]): Directive[] {
  return content.flatMap((content) => {
    // FIXME: 忽略 api/{{var/api/task/{{list}} 这种错误，而不是碰到错误直接返回 empty array
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

function parseDirectivesOfTemplate(
  template: Template,
  {
    excludeNonPromptVariables = false,
    includeEmptyPromptVariables = false,
  }: {
    excludeNonPromptVariables?: boolean;
    includeEmptyPromptVariables?: boolean;
  } = {}
) {
  let directives = parseDirectives(
    ...(template.prompts ?? [])
      .flatMap((item) => {
        if (isPromptMessage(item)) return item.content;
        if (isCallPromptMessage(item) && item.parameters) return Object.values(item.parameters);
        if (isCallAPIMessage(item) && item.url) {
          if (item.body) {
            return [item.url, item.body];
          }

          return [item.url];
        }
        if (isCallDatasetMessage(item) && item.parameters) return Object.values(item.parameters);

        return [];
      })
      .filter((i): i is string => typeof i === 'string')
  );

  if (excludeNonPromptVariables && template.prompts) {
    const outputs = new Set(
      Object.values(template.prompts)
        .map((item) => (isPromptMessage(item) ? undefined : item.output))
        .filter(Boolean)
    );

    directives = directives.filter((i) => {
      if (i.type !== 'variable') return true;
      const variableEntry = toPath(i.name)[0];
      return !outputs.has(variableEntry);
    });
  }

  if (includeEmptyPromptVariables && template.prompts) {
    Object.values(template.prompts).forEach((data) => {
      if (isCallPromptMessage(data) && data.parameters) {
        Object.entries(data.parameters).forEach(([key, value]) => {
          if (!value) {
            directives.push({ type: 'variable', name: key });
          }
        });
      }
    });
  }

  return directives;
}

export function getParametersNeedUserFill(template: Template) {
  return parseDirectivesOfTemplate(template, { excludeNonPromptVariables: true, includeEmptyPromptVariables: true });
}
