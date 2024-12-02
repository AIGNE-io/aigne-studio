import { BlockBase } from '../base';

export interface ProcessImageGeneration extends BlockBase {
  type: 'image-generation';
  imageGeneration?: {
    prompt?: string;

    modelSettings?: {
      model?: string;
    };
  };
}
