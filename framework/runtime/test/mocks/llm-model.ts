import { LLMModel, LLMModelInputs, LLMModelOutputs, RunnableResponseChunk } from '@aigne/core';

export class MockLLMModel extends LLMModel {
  override async *process(_input: LLMModelInputs): AsyncGenerator<RunnableResponseChunk<LLMModelOutputs>> {
    throw new Error('Method not implemented.');
  }
}
