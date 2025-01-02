import type { RunAgentInput } from '@blocklet/aigne-sdk/api/agent';
import { runAgent } from '@blocklet/aigne-sdk/api/agent';

export default async function call({ input, aid }: { input: Omit<RunAgentInput, 'aid' | 'sessionId'>; aid: string }) {
  const sessionId = Date.now().toString();

  return runAgent({
    inputs: {
      question: input,
    },
    working: true,
    sessionId,
    aid,
    responseType: 'text-stream',
  });
}
