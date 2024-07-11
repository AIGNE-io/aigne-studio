import { uniqBy } from 'lodash';

import { RuntimeOutputVariable, RuntimeOutputVariablesSchema, SecretParameter, SourceParameter } from '../../types';
import { GetAgent, GetAgentResult } from '../assistant/type';

export async function resolveSecretInputs(
  agent: GetAgentResult,
  { getAgent }: { getAgent: GetAgent }
): Promise<
  {
    agent: GetAgentResult;
    input: SourceParameter & { key: string; source: SecretParameter };
  }[]
> {
  if (!agent.project) return [];

  const secretInputs = (agent.parameters ?? [])
    .filter(
      (i): i is SourceParameter & { key: string; source: SecretParameter } =>
        !!i.key && i.type === 'source' && i.source?.variableFrom === 'secret'
    )
    .map((input) => ({ agent, input }));

  const outputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);
  const children = outputVariables.find((i) => i.name === RuntimeOutputVariable.children)
    ?.initialValue as RuntimeOutputVariablesSchema['$children'];

  const referencedAgents = [
    ...(children?.agents ?? []).map((i) => ({ id: i.id, projectId: agent.project.id, blockletDid: undefined })),
    ...(agent.parameters ?? []).map((i) => {
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
  ].filter((i): i is NonNullable<typeof i> => !!i);

  const nestedSecretInputs = (
    await Promise.all(
      referencedAgents.map(async (i) => {
        const res = await getAgent({
          blockletDid: i.blockletDid,
          projectId: i.projectId || agent.identity.projectId,
          projectRef: agent.identity.projectRef,
          agentId: i.id,
          working: agent.identity.working,
        });
        return res && resolveSecretInputs(res, { getAgent });
      })
    )
  )
    .flat()
    .filter((i): i is NonNullable<typeof i> => !!i);

  return uniqBy([...secretInputs, ...nestedSecretInputs], (i) => `${i.input.id}-${i.agent.id}-${i.agent.project?.id}`);
}
