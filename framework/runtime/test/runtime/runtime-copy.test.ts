import { OrderedRecord } from '@aigne/core';
import { expect, test } from 'bun:test';

import { Runtime } from '../../src';

test('Runtime.copy', async () => {
  const runtime = new Runtime({
    id: 'test',
    name: 'test',
    projectDefinition: {
      id: 'test',
      name: 'test',
      runnables: OrderedRecord.fromArray([]),
    },
    config: {
      llmModel: {
        default: {
          model: 'o1',
          temperature: 1,
        },
      },
    },
    state: {},
  });

  const copy = runtime.copy({ state: { userId: 'foo' } });

  const strictEqualMembers: (keyof typeof runtime)[] = [
    'id',
    'name',
    'config',
    'agents',
    'container' as keyof typeof runtime,
    'runnables' as keyof typeof runtime,
    'runnableDefinitions' as keyof typeof runtime,
  ];

  for (const member of strictEqualMembers) {
    expect(copy[member]).toBe(runtime[member]!);
  }
});
