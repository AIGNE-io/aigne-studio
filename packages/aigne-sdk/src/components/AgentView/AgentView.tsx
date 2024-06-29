import { CustomComponentRenderer } from '@blocklet/pages-kit/components';

import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '../../constants';

export default function AgentView({
  blockletDid,
  aid,
  working,
}: {
  blockletDid?: string;
  aid: string;
  working?: boolean;
}) {
  return (
    <CustomComponentRenderer componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID} props={{ blockletDid, aid, working }} />
  );
}
