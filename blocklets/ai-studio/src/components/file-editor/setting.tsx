import { useReadOnly } from '@app/contexts/session';
import Close from '@app/pages/project/icons/close';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  defaultImageModel,
  defaultTextModel,
  getSupportedImagesModels,
  getSupportedModels,
} from '@blocklet/ai-runtime/common';
import { AssistantYjs, isImageAssistant, isPromptAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import AdjustmentsIcon from '@iconify-icons/tabler/adjustments';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { useProjectState } from '../../pages/project/state';
import { brandIcon } from '../selector/model-select-field';
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

  const { state } = useProjectState(projectId, gitRef);
  const { project } = state;
  const { value: supportedModels } = useAsync(async () => {
    if (isPromptAssistant(value)) {
      return getSupportedModels();
    }

    if (isImageAssistant(value)) {
      return getSupportedImagesModels();
    }

    return [];
  }, [value.type]);

  const defaultModel = useMemo(() => {
    if (isPromptAssistant(value)) {
      return value?.model || project?.model || defaultTextModel;
    }

    if (isImageAssistant(value)) {
      return value?.model || defaultImageModel;
    }

    return defaultTextModel;
  }, [(value as any).model, project]);

  const modelDetail = useMemo(() => {
    return supportedModels?.find((i) => i.model === defaultModel);
  }, [defaultModel, supportedModels]);

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{ cursor: 'pointer' }}
        onClick={() => {
          dialogState.open();
        }}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          {modelDetail && <Box className="center">{brandIcon(modelDetail!.brand)}</Box>}
          <Typography variant="subtitle3" color="#030712" mt={-0.25}>
            {isPromptAssistant(value)
              ? modelDetail?.name || modelDetail?.model || modelDetail?.model
              : isImageAssistant(value)
                ? defaultModel
                : ''}
          </Typography>
        </Stack>

        <Box component={Icon} icon={AdjustmentsIcon} sx={{ color: '#3B82F6', fontSize: 15 }} />
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
          <Stack gap={1.5}>
            {isPromptAssistant(value) && (
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
    </Box>
  );
}
