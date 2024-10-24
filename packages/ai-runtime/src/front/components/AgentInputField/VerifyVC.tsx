import DidConnect from '@arcblock/did-connect/lib/Connect';
import VerifiedIcon from '@iconify-icons/tabler/discount-check';
import { Icon } from '@iconify/react';
import { Box, Button } from '@mui/material';
import axios from 'axios';
import { useState } from 'react';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../../constants';
import { Parameter } from '../../../types';
import { useEntryAgent } from '../../contexts/EntryAgent';
import { getComponentMountPoint } from '../../utils/mount-point';

const api = axios.create({
  baseURL: getComponentMountPoint(AIGNE_RUNTIME_COMPONENT_DID),
});

export default function VerifyVC({
  aid,
  parameter,
  value,
  onChange,
}: {
  aid: string;
  parameter: Parameter;
  value?: any;
  onChange?: (value?: any) => void;
}) {
  const working = useEntryAgent({ optional: true })?.working;

  const [open, setOpen] = useState(false);

  const verified = value?.status === 'succeed';

  return (
    <>
      <Button
        fullWidth
        variant="outlined"
        onClick={() => setOpen(true)}
        endIcon={verified ? <Box component={Icon} icon={VerifiedIcon} color="success.main" /> : undefined}>
        {verified ? 'Verify Succeed' : 'Verify VC'}
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
