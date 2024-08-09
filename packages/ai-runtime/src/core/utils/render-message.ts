import { get } from 'lodash';

import { Mustache } from '../../types/assistant';

const onlyOneVariable = (text: string) => {
  const pattern = /^\{\{\s*(.*?)\s*\}\}$/;
  const match = text.match(pattern);
  return !!match;
};

// 调用地方:
// Input
// process
// ReadableStream => 需要使用到 .slice(1, -1), 我看只有这一个地方使用到了, 是否需要将 slice 的逻辑提取到业务中?
export async function renderMessage(
  message: string,
  parameters?: { [key: string]: any },
  options: { stringify: boolean } = { stringify: true }
) {
  const spans = Mustache.parse(message.trim());
  if (spans.length === 1 && onlyOneVariable(message.trim())) {
    const span = spans[0]!;
    if (span[0] === 'name') {
      const result = get(parameters, span[1]);
      return options.stringify && typeof result !== 'string' ? JSON.stringify(result) : result;
    }
  }

  return Mustache.render(message, parameters, undefined, {
    escape: (v) => {
      const r = typeof v === 'object' ? JSON.stringify(v) : v;
      return typeof r === 'string' ? JSON.stringify(r).slice(1, -1) : r;
    },
  });
}
