import { GetAgentResult } from '../assistant/type';
import { AgentExecutor } from './agent';
import { AIGCAgentExecutor } from './aigc';
import { APIAgentExecutor } from './api';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';
import { BlockletAgentExecutor } from './blocklet';
import { CallAgentExecutor } from './call-agent';
import { DecisionAgentExecutor } from './decision';
import { LLMAgentExecutor } from './llm';
import { LogicAgentExecutor } from './logic';

export class RuntimeExecutor extends AgentExecutorBase<GetAgentResult> {
  constructor(
    context: Omit<ConstructorParameters<typeof ExecutorContext>[0], 'executor'>,
    agent: GetAgentResult,
    options: AgentExecutorOptions,
    private parentAgent?: GetAgentResult
  ) {
    super(
      new ExecutorContext({
        ...context,
        executor: (agent, options) => new RuntimeExecutor(this.context, agent, options, this.agent),
      }),
      agent,
      options
    );
  }

  override async process() {
    // ignore
  }

  override async execute(): Promise<any> {
    const { agent, options } = this;

    if (this.parentAgent?.identity && agent.identity) {
      agent.identity.blockletDid ||= this.parentAgent.identity.blockletDid;
      agent.identity.projectId ||= this.parentAgent.identity.projectId;
      agent.identity.projectRef ||= this.parentAgent.identity.projectRef;
      agent.identity.working ||= this.parentAgent.identity.working;
    }

    switch (agent.type) {
      case 'agent': {
        return new AgentExecutor(this.context, agent, options).execute();
      }
      case 'prompt': {
        return new LLMAgentExecutor(this.context, agent, options).execute();
      }
      case 'image': {
        return new AIGCAgentExecutor(this.context, agent, options).execute();
      }
      case 'api': {
        return new APIAgentExecutor(this.context, agent, options).execute();
      }
      case 'function': {
        return new LogicAgentExecutor(this.context, agent, options).execute();
      }
      case 'router': {
        return new DecisionAgentExecutor(this.context, agent, options).execute();
      }
      case 'callAgent': {
        return new CallAgentExecutor(this.context, agent, options).execute();
      }
      case 'blocklet': {
        return new BlockletAgentExecutor(this.context, agent, options).execute();
      }
      default: {
        throw new Error(`Unsupported agent type: ${(agent as any)?.type}`);
      }
    }
  }
}
