import { useReadOnly } from '@app/contexts/session';
import Close from '@app/pages/project/icons/close';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ModelBasedAssistantYjs,
  isImageAssistant,
  isPromptAssistant,
  isRouterAssistant,
} from '@blocklet/ai-runtime/types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack } from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';

import { ModelSelectLite } from '../agent-models/model-select-lite';
import { ModelSettingsMenuButton } from '../agent-models/model-settings';
import { resolveModelType } from '../agent-models/utils';
import ImageSettings from './image-file/setting';
import PromptSettings from './prompt-file/setting';

export default function PromptSetting({
  projectId,
  gitRef,
  value,
  disabled = undefined,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const dialogState = usePopupState({ variant: 'dialog' });

  return (
    <Stack
      direction="row"
      sx={{
        gap: 2,
        justifyContent: 'flex-end',
      }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
        }}>
        <ModelSelectLite
          type={resolveModelType(value)!}
          projectId={projectId}
          gitRef={gitRef}
          agent={value as ModelBasedAssistantYjs}
        />
        <ModelSettingsMenuButton agent={value as ModelBasedAssistantYjs} />
      </Stack>
      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={(e) => e.preventDefault()}>
        <DialogTitle className="between">
          <Box>{t('setting')}</Box>

          <IconButton size="small" onClick={dialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack
            sx={{
              gap: 1.5,
            }}>
            {(isPromptAssistant(value) || isRouterAssistant(value)) && (
              <PromptSettings projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
            )}

            {isImageAssistant(value) && (
              <ImageSettings projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="contained" onClick={dialogState.close}>
            {t('ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
