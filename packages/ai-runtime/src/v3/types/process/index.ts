import { ProcessCallAgent } from './call-agent';
import { ProcessDecision } from './decision';
import { ProcessImageGeneration } from './image-generation';
import { ProcessLLM } from './llm';
import { ProcessLogic } from './logic';

export type AgentProcess = ProcessCallAgent | ProcessDecision | ProcessLLM | ProcessImageGeneration | ProcessLogic;
