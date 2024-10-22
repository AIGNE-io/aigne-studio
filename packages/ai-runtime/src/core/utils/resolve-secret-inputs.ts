import { uniqBy } from 'lodash';

import { parseIdentity, stringifyIdentity } from '../../common/aid';
import { RuntimeOutputVariable, RuntimeOutputVariablesSchema, SecretParameter, SourceParameter } from '../../types';
import { isNonNullable } from '../../utils/is-non-nullable';
import { GetAgent, GetAgentResult } from '../assistant/type';

export async function resolveSecretInputs(
  agent: GetAgentResult,
  { getAgent }: { getAgent: GetAgent }
): Promise<
  {
    agent: GetAgentResult & Required<Pick<GetAgentResult, 'project'>>;
    input: SourceParameter & { key: string; source: SecretParameter };
  }[]
> {
  if (!agent.project) return [];

  const secretInputs = (agent.parameters ?? [])
    .filter(
      (i): i is SourceParameter & { key: string; source: SecretParameter } =>
        !!i.key && i.type === 'source' && i.source?.variableFrom === 'secret' && !i.hidden
    )
    .map((input) => ({ agent, input }));

  const outputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);
  const children = outputVariables.find((i) => i.name === RuntimeOutputVariable.children)
    ?.initialValue as RuntimeOutputVariablesSchema['$children'];

  const referencedAgents = [
    ...(children?.agents ?? []).map((i) => ({ id: i.id, projectId: agent.project.id, blockletDid: undefined })),
    ...(agent.parameters ?? []).map((i) => {
      if (i.hidden) return null;

      if (i.type === 'source' && i.source?.variableFrom === 'tool' && i.source.agent?.id) {
        return {
          id: i.source.agent.id,
          blockletDid: i.source.agent.blockletDid,
          projectId: i.source.agent.projectId,
        };
      }

      return null;
    }),
    ...(agent.executor?.agent?.id ? [agent.executor.agent] : []),
  ].filter(isNonNullable);

  const identity = parseIdentity(agent.identity.aid, { rejectWhenError: true });

  const nestedSecretInputs = (
    await Promise.all(
      referencedAgents.map(async (i) => {
        const res = await getAgent({
          aid: stringifyIdentity({
            blockletDid: i.blockletDid || identity.blockletDid,
            projectId: i.projectId || identity.projectId,
            projectRef: identity.projectRef || identity.projectRef,
            agentId: i.id,
          }),
          working: agent.identity.working,
        });
        return res && resolveSecretInputs(res, { getAgent });
      })
    )
  )
    .flat()
    .filter(isNonNullable);

  return uniqBy([...secretInputs, ...nestedSecretInputs], (i) => `${i.input.id}-${i.agent.id}-${i.agent.project?.id}`);
}
