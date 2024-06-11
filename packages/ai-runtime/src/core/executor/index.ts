import { Assistant } from '../../types';
import { AgentExecutor } from './agent';
import { AIGCAgentExecutor } from './aigc';
import { APIAgentExecutor } from './api';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';
import { DecisionAgentExecutor } from './decision';
import { LLMAgentExecutor } from './llm';
import { LogicAgentExecutor } from './logic';

export class RuntimeExecutor extends AgentExecutorBase {
  constructor(options: Omit<ConstructorParameters<typeof ExecutorContext>[0], 'executor'>) {
    super(new ExecutorContext({ ...options, executor: (context) => new RuntimeExecutor(context ?? this.context) }));
  }

  override async process() {
    // ignore
  }

  override async execute(agent: Assistant & { project: { id: string } }, options: AgentExecutorOptions) {
    switch (agent.type) {
      case 'agent': {
        return new AgentExecutor(this.context).execute(agent, options);
      }
      case 'prompt': {
        return new LLMAgentExecutor(this.context).execute(agent, options);
      }
      case 'image': {
        return new AIGCAgentExecutor(this.context).execute(agent, options);
      }
      case 'api': {
        return new APIAgentExecutor(this.context).execute(agent, options);
      }
      case 'function': {
        return new LogicAgentExecutor(this.context).execute(agent, options);
      }
      case 'router': {
        return new DecisionAgentExecutor(this.context).execute(agent, options);
      }
      default: {
        throw new Error(`Unsupported agent type: ${(agent as any)?.type}`);
      }
    }
  }
}
