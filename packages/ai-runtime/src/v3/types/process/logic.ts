import { BlockBase } from '../base';
import { TypeRef } from '../type-define';
import { OrderedMap } from '../utils';

export interface ProcessLogic extends BlockBase {
  type: 'logic';
  logic?: {
    code?: {
      language: 'javascript';
      javascript?: string;
    };

    outputs?: {
      fields?: OrderedMap<LLMOutputField>;
    };
  };
}

export type LLMOutputField = TypeRef & {
  id: string;
  name?: string;
  description?: string;
  required?: boolean;
};
