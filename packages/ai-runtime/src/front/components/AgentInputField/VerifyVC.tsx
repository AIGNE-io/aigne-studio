import DidConnect from '@arcblock/did-connect/lib/Connect';
import VerifiedIcon from '@iconify-icons/tabler/discount-check';
import { Icon } from '@iconify/react';
import { Box, Button } from '@mui/material';
import axios from 'axios';
import { useMemo, useRef, useState } from 'react';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../../constants';
import { VerifyVCParameter } from '../../../types';
import { useAgent } from '../../contexts/Agent';
import { useComponentPreferences } from '../../contexts/ComponentPreferences';
import { useCurrentAgent } from '../../contexts/CurrentAgent';
import { useEntryAgent } from '../../contexts/EntryAgent';
import { isValidInput } from '../../utils/agent-inputs';
import { getComponentMountPoint } from '../../utils/mount-point';

const api = axios.create({
  baseURL: getComponentMountPoint(AIGNE_RUNTIME_COMPONENT_DID),
});

export default function VerifyVC({
  parameter,
  value,
  onChange,
}: {
  parameter: VerifyVCParameter;
  value?: any;
  onChange?: (value?: any) => void;
}) {
  const preferences = useComponentPreferences();

  const { aid } = useCurrentAgent();
  const agent = useAgent({ aid });
  const parameters = useMemo(
    () =>
      agent.parameters
        ?.filter((i) => isValidInput(i) && !preferences?.hideInputFields?.includes(i.key))
        .map((i) => ({
          ...i,
          label: i.label?.trim() || undefined,
        })),
    [agent.parameters]
  );

  const isOnlyOneVCInput = parameters?.length === 1 && parameters[0]?.type === 'verify_vc';

  const working = useEntryAgent({ optional: true })?.working;

  const [open, setOpen] = useState(false);

  const verified = value?.status === 'succeed';

  const ref = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={ref}
        fullWidth
        variant="outlined"
        onClick={() => setOpen(true)}
        endIcon={verified ? <Box component={Icon} icon={VerifiedIcon} color="success.main" /> : undefined}>
        {verified ? parameter.buttonTitleVerified || 'Verify Succeed' : parameter.buttonTitle || 'Verify VC'}
      </Button>

      <DidConnect
        popup
        open={open}
        action="verify-vc"
        checkFn={api.get}
        onClose={() => setOpen(false)}
        checkTimeout={5 * 60 * 1000}
        extraParams={{ aid, working, inputId: parameter.id }}
        onSuccess={(res: any) => {
          setOpen(false);
          onChange?.(res);
          if (isOnlyOneVCInput) {
            ref.current?.form?.requestSubmit();
          }
        }}
        autoConnect
        saveConnect
        forceConnected
        messages={{
          title: parameter.placeholder || parameter.helper || 'Provide Your VC',
          scan: 'Connect your DID Wallet to provide',
          confirm: 'Confirm on your DID Wallet',
          success: 'Ownership verified',
        }}
      />
    </>
  );
}
