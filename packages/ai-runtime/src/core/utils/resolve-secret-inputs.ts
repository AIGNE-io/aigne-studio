import { uniqBy } from 'lodash';

import {
  Assistant,
  RuntimeOutputVariable,
  RuntimeOutputVariablesSchema,
  SecretParameter,
  SourceParameter,
} from '../../types';
import { GetAssistant } from '../assistant/type';

export async function resolveSecretInputs(
  agent: Assistant & { project: { id: string } },
  { getAssistant }: { getAssistant: GetAssistant }
): Promise<
  {
    agent: Assistant & { project: { id: string } };
    input: SourceParameter & { key: string; source: SecretParameter };
  }[]
> {
  const secretInputs = (agent.parameters ?? [])
    .filter(
      (i): i is SourceParameter & { key: string; source: SecretParameter } =>
        !!i.key && i.type === 'source' && i.source?.variableFrom === 'secret'
    )
    .map((input) => ({ agent, input }));

  const children = agent.outputVariables?.find((i) => i.name === RuntimeOutputVariable.children)
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
        const agent = await getAssistant(i.id, {
          blockletDid: i.blockletDid,
          projectId: i.projectId,
        });
        if (agent) {
          return resolveSecretInputs(agent, { getAssistant });
        }
        return null;
      })
    )
  )
    .flat()
    .filter((i): i is NonNullable<typeof i> => !!i);

  return uniqBy([...secretInputs, ...nestedSecretInputs], (i) => `${i.input.id}-${i.agent.id}-${i.agent.project.id}`);
}
