import { Message } from '@blocklet/pages-kit/builtin/async/ai-runtime/api/message';
import { joinURL } from 'ufo';

import { aigneRuntimeApi } from './api';

export async function getMessageById({ messageId }: { messageId: string }): Promise<Message> {
  return aigneRuntimeApi.get(joinURL('/api/messages', messageId)).then((res) => res.data);
}
