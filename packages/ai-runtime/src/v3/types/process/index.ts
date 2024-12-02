import { ProcessCallAgent } from './call-agent';
import { ProcessDecision } from './decision';
import { ProcessImageGeneration } from './image-generation';
import { ProcessLLM } from './llm';

export type AgentProcess = ProcessCallAgent | ProcessDecision | ProcessLLM | ProcessImageGeneration;
