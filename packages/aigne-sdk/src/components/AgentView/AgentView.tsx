import { ComponentProps } from 'react';

import { Runtime } from '../ai-runtime';

export default function AgentView(props: ComponentProps<typeof Runtime>) {
  return <Runtime {...props} />;
}
