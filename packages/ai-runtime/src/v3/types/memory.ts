import { TypeRef } from './type-define';

export type Memory = TypeRef & {
  id: string;
  name?: string;
  description?: string;
};
