import { nanoid } from 'nanoid';

import { Memorable } from '../memorable';
import { RunnableInput, RunnableMemory } from '../runnable';
import { OrderedRecord } from '../utils';
import { DataTypeSchema } from './data-type-schema';

export interface CreateRunnableMemory<I extends { [key: string]: DataTypeSchema } = {}> {
  /**
   * Memory instance to query/store memory.
   */
  memory: Memorable<any>;

  /**
   * Custom query to retrieve memory, if not provided, all input variables will be used.
   *
   * @example
   * {
   *   fromVariable: 'question' // question is a string input variable
   * }
   */
  query?: {
    /**
     * Variable name from input used to query memory.
     */
    fromVariable?: keyof { [key in keyof I as I[key]['type'] extends 'string' ? key : never]: any };
  };

  /**
   * Custom options for memory query.
   */
  options?: {
    /**
     * Number of memories to retrieve.
     */
    k?: number;
  };
}

export function toRunnableMemories<I extends {}>(
  agentName: string,
  inputs: OrderedRecord<RunnableInput>,
  memories: { [name: string]: CreateRunnableMemory<I> }
): OrderedRecord<RunnableMemory> {
  return OrderedRecord.fromArray<RunnableMemory>(
    Object.entries(memories).map(([name, { memory, query, options }]) => {
      const queryFromVariable = query?.fromVariable
        ? OrderedRecord.find(inputs, (j) => j.name === query.fromVariable)
        : null;
      if (query?.fromVariable && !queryFromVariable)
        throw new Error(
          `LLMAgent ${agentName} -> Memory ${name} -> Query variable ${query.fromVariable.toString()} not found`
        );

      return {
        id: name || nanoid(),
        name: name,
        memory: memory,
        query: queryFromVariable ? { from: 'variable', fromVariableId: queryFromVariable.id } : undefined,
        options,
      };
    })
  );
}
