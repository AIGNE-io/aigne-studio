import { LLMModel, LLMModelInputs, LLMModelOutputs } from '@aigne/core';

export class MockLLMModel extends LLMModel {
  override async process(_input: LLMModelInputs): Promise<LLMModelOutputs> {
    throw new Error('Method not implemented.');
  }
}
