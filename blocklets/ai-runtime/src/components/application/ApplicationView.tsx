import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '@blocklet/ai-runtime/constants';
import { RuntimeResourceBlockletState } from '@blocklet/ai-runtime/types/runtime/runtime-resource-blocklet-state';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';

export default function ApplicationView({
  application,
}: {
  application: RuntimeResourceBlockletState['applications'][number];
}) {
  return (
    <CustomComponentRenderer
      componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID}
      props={{
        blockletDid: application.blockletDid,
        aid: application.aid,
        working: false,
      }}
    />
  );
}
