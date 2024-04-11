import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack, Typography } from '@mui/material';
import { useAssistantCompare } from 'src/pages/project/state';

import { useReadOnly } from '../../../contexts/session';
import TipsAndUpdatesRounded from '../../../pages/project/icons/tips';
import PromptEditorField from '../prompt-editor-field';

export default function ImageFilePrompt({
  gitRef,
  value,
  projectId,
  disabled,
  compareValue,
  isRemoteCompare,
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
      gap={1}
      sx={{
        borderRadius: 1,
        bgcolor: '#EFF6FF',
        px: 2,
        py: 1.5,
      }}>
      <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
        <TipsAndUpdatesRounded sx={{ color: '#3B82F6', fontSize: 15 }} />
        <Typography variant="subtitle2" sx={{ m: 0 }}>
          {t('formatPrompt')}
        </Typography>
      </Stack>

      <Box
        border="1px solid #3B82F6"
        borderRadius={1}
        minHeight={64}
        sx={{
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
