import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { SecretParameter, SourceParameter } from '@blocklet/ai-runtime/types';
import { call } from '@blocklet/sdk/lib/component';

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
