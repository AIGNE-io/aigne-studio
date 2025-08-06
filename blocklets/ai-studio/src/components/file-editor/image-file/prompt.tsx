import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';
import { useAssistantCompare } from 'src/pages/project/state';

import { useReadOnly } from '../../../contexts/session';
import PromptEditorField from '../prompt-editor-field';

export default function ImageFilePrompt({
  gitRef,
  value,
  projectId,
  disabled = undefined,
  compareValue = undefined,
  isRemoteCompare = undefined,
}: {
  gitRef: string;
  projectId: string;
  value: ImageAssistantYjs;
  disabled?: boolean;
  compareValue?: ImageAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  return (
    <Stack
      sx={{
        gap: 1,
      }}>
      <Box
        sx={{
          border: '1px solid #3B82F6',
          borderRadius: 1,
          minHeight: 64,

          '.ContentEditable__root': {
            p: 1,
            px: 1.5,
            minHeight: 64,
            bgcolor: 'background.paper',
            borderRadius: 1,

            ':hover': {
              bgcolor: 'background.paper',
            },

            ':focus': {
              bgcolor: 'background.paper',
            },
          },

          '.Placeholder__root': {
            top: '8px',
            left: '12px',
            bottom: 'inherit',
            fontSize: '14px',
            lineHeight: '24px',
          },
        }}>
        <PromptEditorField
          value={value.prompt}
          projectId={projectId}
          gitRef={gitRef}
          placeholder={t('promptPlaceholder')}
          path={[value.id, 'prompt']}
          onChange={(prompt) => (value.prompt = prompt)}
          readOnly={readOnly}
          ContentProps={{ sx: { borderRadius: 2, backgroundColor: getDiffBackground('prompt') } }}
          assistant={value}
        />
      </Box>
    </Stack>
  );
}
