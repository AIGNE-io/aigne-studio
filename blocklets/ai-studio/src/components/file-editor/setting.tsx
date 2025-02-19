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
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormGroup,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';

import { ModelSelectLite } from '../agent-models/model-select-lite';
import { ModelSettingsMenuButton } from '../agent-models/model-settings';
import { resolveModelType } from '../agent-models/utils';
import Switch from '../custom/switch';
import ImageSettings from './image-file/setting';
import PromptSettings from './prompt-file/setting';

export default function PromptSetting({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const dialogState = usePopupState({ variant: 'dialog' });
  const conditionalBranch = value.type === 'router' && value.decisionType === 'json-logic';

  return (
    <Stack gap={2} direction="row" justifyContent="flex-end">
      {value.type === 'router' && (
        <FormGroup row sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography>{t('decision.AI')}</Typography>
          <Switch
            sx={{ mx: 1 }}
            checked={conditionalBranch}
            onChange={(e) => {
              value.decisionType = e.target.checked ? 'json-logic' : 'ai';
            }}
          />
          <Typography>{t('decision.branch')}</Typography>
        </FormGroup>
      )}

      {!conditionalBranch && (
        <Stack direction="row" alignItems="center">
          <ModelSelectLite
            type={resolveModelType(value)!}
            projectId={projectId}
            gitRef={gitRef}
            agent={value as ModelBasedAssistantYjs}
          />
          <ModelSettingsMenuButton agent={value as ModelBasedAssistantYjs} />
        </Stack>
      )}

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
          <Stack gap={1.5}>
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
