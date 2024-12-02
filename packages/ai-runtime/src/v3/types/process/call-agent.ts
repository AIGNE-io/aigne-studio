import { BlockBase } from '../base';

export interface ProcessCallAgent extends BlockBase {
  type: 'call-agent';

  callAgent?: {
    agent?: { id: string };

    inputs?: { [inputId: string]: { value: any } };
  };
}
