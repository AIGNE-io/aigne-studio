import { CustomComponentRenderer } from '@blocklet/pages-kit/components';

import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '../../constants';
import { ComponentPreferencesBase, ComponentPreferencesProvider } from '../ai-runtime';

export default function AgentView({
  blockletDid,
  aid,
  working,
  debug,
  ...props
}: {
  blockletDid?: string;
  aid: string;
  working?: boolean;
  debug?: Record<string, any>;
} & ComponentPreferencesBase & { [key: string]: any }) {
  return (
    <ComponentPreferencesProvider {...props}>
      <CustomComponentRenderer
        componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID}
        props={{ blockletDid, aid, working, debug, props }}
      />
    </ComponentPreferencesProvider>
  );
}
