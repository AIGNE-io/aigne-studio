import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { SecretParameter, SourceParameter } from '@blocklet/ai-runtime/types';
import { call } from '@blocklet/sdk/lib/component';
import { joinURL } from 'ufo';

export async function getAgentSecretInputs({
  blockletDid,
  aid,
  working,
}: {
  blockletDid?: string;
  aid: string;
  working?: boolean;
}): Promise<{
  secrets: {
    targetProjectId: string;
    targetAgentId: string;
    targetInput: SourceParameter & {
      key: string;
      source: SecretParameter;
    };
    hasValue: boolean;
  }[];
}> {
  return call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    method: 'GET',
    path: '/api/secrets/by-aid',
    params: { blockletDid, aid, working },
  }).then((res) => res.data);
}

export interface Message {
  id: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  projectRef?: string;
  agentId: string;
  sessionId: string;
  blockletDid?: string;
  inputs?: { [key: string]: any } | null;
  outputs?: { content?: string; objects?: any[] } | null;
  error?: { message: string } | null;
  status?: 'generating' | 'done';
}

export async function getMessageFromRuntime({ messageId }: { messageId: string }): Promise<Message> {
  return call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    method: 'GET',
    path: joinURL('/api/messages', messageId),
  }).then((res) => res.data);
}
