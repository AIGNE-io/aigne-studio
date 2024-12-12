import { getAgent } from '@api/libs/agent';
import { verifyPresentation } from '@arcblock/vc';
import { VerifyVCParameter } from '@blocklet/ai-runtime/types';
import Joi from 'joi';

import { wallet } from '../../libs/auth';

const CURRENT_APPLICATION_ISSUER = 'current_application';

const verifyVCExtraParamsSchema = Joi.object<{
  aid: string;
  working?: boolean;
  inputId: string;
}>({
  aid: Joi.string().required(),
  working: Joi.boolean().empty(['', null]),
  inputId: Joi.string().required(),
});

async function getVerifyVCInput(extraParams: any) {
  const params = await verifyVCExtraParamsSchema.validateAsync(extraParams, { stripUnknown: true });
  const agent = await getAgent({ aid: params.aid, working: params.working, rejectOnEmpty: true });
  const input = agent.parameters?.find((i) => i.id === params.inputId);
  if (!input || input.type !== 'verify_vc') throw new Error(`Invalid input type ${input?.type}`);
  return input;
}

function getTrustedIssuers(input: VerifyVCParameter) {
  return [wallet.address, ...(input.vcTrustedIssuers ?? []).filter((i) => i !== CURRENT_APPLICATION_ISSUER)];
}

export default {
  action: 'verify-vc',
  claims: {
    verifiableCredential: async ({ extraParams }: any) => {
      const input = await getVerifyVCInput(extraParams);

      return {
        description: 'Please provide your blocklet purchase NFT',
        item: input.vcItem ?? [],
        trustedIssuers: getTrustedIssuers(input),
      };
    },
  },
  onAuth: async ({ claims, challenge, extraParams, updateSession }: any) => {
    const input = await getVerifyVCInput(extraParams);

    const presentation = JSON.parse(claims.find((x: any) => x.type === 'verifiableCredential').presentation);
    if (challenge !== presentation.challenge) {
      throw Error('Verifiable credential presentation does not have correct challenge');
    }

    verifyPresentation({
      presentation,
      trustedIssuers: getTrustedIssuers(input),
      challenge,
    });

    const vcArray = Array.isArray(presentation.verifiableCredential)
      ? presentation.verifiableCredential
      : [presentation.verifiableCredential];

    const vc = JSON.parse(vcArray[0]);

    updateSession({ vc });
  },
};
