import { MessageItem } from '@blocklet/pages-kit/builtin/async/ai-runtime';
import { joinURL } from 'ufo';

import api from './api';

export async function getMessageById({ messageId }: { messageId: string }): Promise<MessageItem> {
  return api.get(joinURL('/api/message', messageId)).then((res) => res.data);
}
