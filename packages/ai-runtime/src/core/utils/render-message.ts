import { Mustache } from '../../types/assistant';

export async function renderMessage(message: string, parameters?: { [key: string]: any }) {
  return Mustache.render(message, parameters, undefined, {
    escape: (v) => {
      const r = typeof v === 'object' ? JSON.stringify(v) : v;
      return typeof r === 'string' ? JSON.stringify(r).slice(1, -1) : r;
    },
  });
}
