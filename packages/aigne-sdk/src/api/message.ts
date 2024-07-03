import { MessageItem } from '@blocklet/pages-kit/builtin/async/ai-runtime';
import { joinURL } from 'ufo';

import { aigneRuntimeApi } from './api';

export async function getMessageById({
  messageId,
}: {
  messageId: string;
}): Promise<MessageItem & { projectId: string; blockletDid: string }> {
  return aigneRuntimeApi.get(joinURL('/api/messages', messageId)).then((res) => res.data);
}
