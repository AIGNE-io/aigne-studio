// @ts-ignore
import { sendToRelay } from '@blocklet/sdk/service/notification';

export const broadcast = (channel: string, eventName: string, data: any) =>
  sendToRelay(channel, eventName, data).catch((err: Error) =>
    console.error(`Failed to broadcast info: vault.${channel}.${eventName}`, err)
  );
