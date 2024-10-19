import { Runtime } from '@blocklet/ai-runtime/front';
import { ComponentProps } from 'react';

export default function AgentView(props: ComponentProps<typeof Runtime>) {
  return <Runtime {...props} />;
}
