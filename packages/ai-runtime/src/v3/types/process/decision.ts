import { BlockBase } from '../base';
import { OrderedMap } from '../utils';
import { AgentProcess } from '.';

export interface ProcessDecision extends BlockBase {
  type: 'decision';
  decision?: DecisionClassifier | DecisionLogic;
}

export interface DecisionCaseBase extends BlockBase {
  processes?: OrderedMap<AgentProcess>;
}

export interface DecisionClassifier {
  type: 'classifier';

  cases?: OrderedMap<DecisionCaseClassifier>;
}

export interface DecisionCaseClassifier extends DecisionCaseBase {}

export interface DecisionLogic {
  type: 'logic';

  cases?: OrderedMap<DecisionCaseLogic>;
}

export type JsonLogic = any;

export interface DecisionCaseLogic extends DecisionCaseBase {
  logic?: JsonLogic;
}
