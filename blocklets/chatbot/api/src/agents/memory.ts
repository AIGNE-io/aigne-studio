import { join } from 'path';

import chatbot from '@aigne-project/chatbot';
import { TYPES } from '@aigne/core';
import { DefaultMemory, LongTermMemoryRunner, ShortTermMemoryRunner } from '@aigne/memory';
// import { Runtime } from '@aigne/runtime';
import { config } from '@blocklet/sdk';

const userPreferences = DefaultMemory.load<{
  model?: string;
}>({
  path: join(config.env.dataDir, 'user-model-memory'),
});

const longTermMemory = DefaultMemory.load({
  path: join(config.env.dataDir, 'long-term-memory'),
  runner: new LongTermMemoryRunner(),
});
const shortTermMemory = DefaultMemory.load({
  path: join(config.env.dataDir, 'short-term-memory'),
  runner: new ShortTermMemoryRunner(chatbot.container.resolve(TYPES.llmModel)),
});

export { userPreferences, longTermMemory, shortTermMemory };
