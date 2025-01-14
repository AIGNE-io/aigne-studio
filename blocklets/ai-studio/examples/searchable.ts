import 'reflect-metadata';

import { LLMAgent, OrderedRecord } from '@aigne/core';
import { Runtime } from '@aigne/runtime';

(async () => {
  const runtime = new Runtime(
    {
      id: 'searchable',
      runnables: OrderedRecord.fromArray([]),
    },
    {}
  );

  let chat = LLMAgent.create({
    name: 'chat',
    inputs: {
      question: {
        type: 'string',
        required: true,
      },
    },
    outputs: {
      $text: {
        type: 'string',
        required: true,
      },
    },
    messages: [
      {
        role: 'user',
        content: '{{question}}',
      },
    ],
  });

  runtime.register(chat.definition);

  chat = await runtime.resolve('chat');

  const result = await chat.run({ question: 'Hello, world!' });

  console.log('result', result);
})();
