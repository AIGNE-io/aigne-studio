import { ComponentProps } from 'react';

import { Runtime } from '../ai-runtime';

export default function AgentView({ ...rest }: ComponentProps<typeof Runtime>) {
  return <Runtime {...rest} />;
}
