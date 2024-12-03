import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { AddComponent } from '@blocklet/ui-react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogProps, DialogTitle, Stack } from '@mui/material';
import { useRef } from 'react';

import { useIsAdmin } from '../../contexts/session';
import { ModelType } from './types';
import { useAllModels, useBrandTags } from './use-models';

interface Props {}

export function ModelSelect({ ...rest }: Props) {
  return (
    <Box {...rest}>
      <Box>ModelSelect...</Box>
    </Box>
  );
}

interface ModelSelectDialogProps {
  type: ModelType;
  dialogProps: DialogProps;
}

export function ModelSelectDialog({ type, dialogProps }: ModelSelectDialogProps) {
  const { t } = useLocaleContext();
  const models = useAllModels(type);
  console.log('🚀 ~ ModelSelectDialog ~ models:', models);
  const brandTags = useBrandTags();
  const isAdmin = useIsAdmin();
  const addComponentRef = useRef<{ onClick?: () => void; loading?: boolean }>();

  return (
    <Dialog maxWidth="md" fullWidth {...dialogProps} open>
      <DialogTitle>Models</DialogTitle>

      <DialogContent>
        <ModelSelect />
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button variant="outlined" disabled={!isAdmin} onMouseDown={addComponentRef.current?.onClick}>
          {t('addMoreAgentTools')}
        </Button>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={(e) => dialogProps.onClose?.(e, 'backdropClick')}>
            {t('close')}
          </Button>
          <Button variant="contained">Use this Model</Button>
        </Stack>
      </DialogActions>

      <AddComponent
        componentDid={window.blocklet.appId}
        resourceDid={AIGNE_STUDIO_COMPONENT_DID}
        resourceType={type}
        autoClose={false}
        render={({ onClick, loading }) => {
          addComponentRef.current = { onClick, loading };
          return <Box />;
        }}
        onClose={() => {}}
        onComplete={() => {}}
      />
    </Dialog>
  );
}
