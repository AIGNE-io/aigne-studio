import { GetAgentResult } from '../assistant/type';
import { AgentExecutor } from './agent';
import { AIGCAgentExecutor } from './aigc';
import { APIAgentExecutor } from './api';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';
import { CallAgentExecutor } from './call-agent';
import { DecisionAgentExecutor } from './decision';
import { LLMAgentExecutor } from './llm';
import { LogicAgentExecutor } from './logic';
import { ParallelCallAgentExecutor } from './parallel-call';

export class RuntimeExecutor extends AgentExecutorBase {
  constructor(
    options: Omit<ConstructorParameters<typeof ExecutorContext>[0], 'executor'>,
    private parentAgent?: GetAgentResult
  ) {
    super(
      new ExecutorContext({
        ...options,
        executor: (context) => new RuntimeExecutor(context ?? this.context, this.agent),
      })
    );
  }

  private agent?: GetAgentResult;

  override async process() {
    // ignore
  }

  override async execute(agent: GetAgentResult, options: AgentExecutorOptions): Promise<any> {
    if (this.parentAgent) {
      agent.identity.blockletDid ||= this.parentAgent.identity.blockletDid;
      agent.identity.projectId ||= this.parentAgent.identity.projectId;
      agent.identity.projectRef ||= this.parentAgent.identity.projectRef;
      agent.identity.working ||= this.parentAgent.identity.working;
    }

    this.agent = agent;

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
      case 'callAgent': {
        return new CallAgentExecutor(this.context).execute(agent, options);
      }
      case 'parallelCallAgent': {
        return new ParallelCallAgentExecutor(this.context).execute(agent, options);
      }
      default: {
        throw new Error(`Unsupported agent type: ${(agent as any)?.type}`);
      }
    }
  }
}
