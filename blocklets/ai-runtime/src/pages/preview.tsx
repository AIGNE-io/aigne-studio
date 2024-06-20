import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '@app/libs/constants';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import { useParams } from 'react-router-dom';

export default function PreviewPage() {
  const { aid } = useParams();
  if (!aid) throw new Error('Missing required param `aid`');

  return (
    <>
      <ApplicationHeader />

      <CustomComponentRenderer
        componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID}
        props={{
          aid,
          working: true,
        }}
      />
    </>
  );
}
