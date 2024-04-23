import { Assistant, Role } from '../../types';
import retry from '../utils/retry';
import { outputVariablesToJoiSchema, outputVariablesToJsonSchema } from '../utils/schema';
import { CallAI } from './type';

export async function generateOutput({
  assistant,
  messages,
  callAI,
  maxRetries = 0,
}: {
  assistant: Assistant;
  messages: { role: Role; content: string }[];
  callAI: CallAI;
  maxRetries?: number;
}) {
  const jsonSchema = outputVariablesToJsonSchema(assistant.outputVariables ?? []);
  const joiSchema = outputVariablesToJoiSchema(assistant.outputVariables ?? []);

  const outputSchema = JSON.stringify(jsonSchema, null, 2);

  messages.push({
    role: 'user',
    content: `\
Generate a json object according above messages.

## Output Format

[Output a JSON object by the following JSON schema]
${outputSchema}
`,
  });

  return retry(async () => {
    const result = await callAI({
      assistant,
      outputModel: true,
      input: {
        stream: true,
        messages,
      },
    });

    let text = '';

    for await (const chunk of result.chatCompletionChunk) {
      text += chunk.delta.content || '';
    }

    const json = JSON.parse(text);

    return await joiSchema.validateAsync(json);
  }, maxRetries);
}
