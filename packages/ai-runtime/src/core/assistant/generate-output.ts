import { ReadableStream, TransformStream } from 'stream/web';

import { ChatCompletionChunk } from '@blocklet/ai-kit/api/types/chat';

import { Assistant, Role } from '../../types';
import { ExtractMetadataTransform } from '../utils/extract-metadata-transform';
import retry from '../utils/retry';
import { outputVariablesToJoiSchema, outputVariablesToJsonSchema } from '../utils/schema';
import { CallAI } from './type';

export const metadataPrefix = '```metadata';
export const metadataSuffix = '```';

export const metadataOutputFormatPrompt = (schema: string) => `\
## Metadata Schema
Here is the metadata json schema, inside the <metadata-schema></metadata-schema> XML tags:
<metadata-schema>
${schema}
</metadata-schema>

## Output Format
[Rules: You have to generate a json metadata base on the metadata schema above, inside the <metadata-schema></metadata-schema> XML tags]
[Generate a JSON object based on the context, your answer and the metadata json schema above and put it the ${metadataPrefix} code block]
${metadataPrefix}
${metadataSuffix}
`;

export const metadataStreamOutputFormatPrompt = (schema: string) => `\
## Metadata Schema
Here is the metadata json schema, inside the <metadata-schema></metadata-schema> XML tags:
<metadata-schema>
${schema}
</metadata-schema>

## Output Format

[Rules: You have to generate a text content and a json metadata base on the metadata schema above, inside the <metadata-schema></metadata-schema> XML tags]

[Place Your Text Content here]

[Generate a JSON object based on the context, your answer and the metadata json schema above and put it the ${metadataPrefix} code block]
${metadataPrefix}
${metadataSuffix}
`;

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
    role: 'system',
    content: metadataOutputFormatPrompt(outputSchema),
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

    for await (const chunk of extractMetadataFromStream(result.chatCompletionChunk, true)) {
      if (chunk.type === 'match') text += chunk.text;
    }

    const json = JSON.parse(text);

    return await joiSchema.validateAsync(json);
  }, maxRetries);
}

export function extractMetadataFromStream(input: ReadableStream<ChatCompletionChunk>, extract: boolean = true) {
  return input
    .pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (chunk.delta.content) controller.enqueue(chunk.delta.content);
        },
      })
    )
    .pipeThrough(
      new ExtractMetadataTransform({
        // Pass empty string to disable extractor
        start: extract ? metadataPrefix : '',
        end: extract ? metadataSuffix : '',
      })
    );
}
