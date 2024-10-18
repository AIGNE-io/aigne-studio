import { CustomComponentRenderer } from '@blocklet/pages-kit/components';

import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '../../constants';
import { ComponentPreferencesBase, ComponentPreferencesProvider } from '../ai-runtime';

export default function AgentView({
  aid,
  working,
  ...props
}: {
  aid: string;
  working?: boolean;
} & ComponentPreferencesBase & { [key: string]: any }) {
  return (
    <ComponentPreferencesProvider {...props}>
      <CustomComponentRenderer componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID} props={{ aid, working }} />
    </ComponentPreferencesProvider>
  );
}
