import { get } from 'lodash';

import { Mustache } from '../../types/assistant';

const isBracketStartAndEnd = (text: string) => {
  const pattern = /^\{\{(.*)\}\}$/;
  const match = text.match(pattern);
  return !!match;
};

// 调用地方:
// Input
// process
// ReadableStream => 需要使用到 .slice(1, -1), 我看只有这一个地方使用到了, 是否需要将 slice 的逻辑提取到业务中?
export async function renderMessage(message: string, parameters?: { [key: string]: any }, stringify = true) {
  const fn = async () => {
    const spans = Mustache.parse(message);
    if (spans.length === 1 && isBracketStartAndEnd(message.trim())) {
      const span = spans[0]?.[1];
      if (span) return get(parameters, span);
    }

    return Mustache.render(message, parameters, undefined, {
      escape: (v) => {
        const r = typeof v === 'object' ? JSON.stringify(v) : v;
        return typeof r === 'string' ? JSON.stringify(r).slice(1, -1) : r;
      },
    });
  };

  const result = await fn();
  return stringify ? (typeof result === 'object' ? JSON.stringify(result) : result) : result;
}
