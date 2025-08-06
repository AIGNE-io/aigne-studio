import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs } from '@blocklet/ai-runtime/types';
import { Box, Typography } from '@mui/material';

import SliderNumberField from '../slider-number-field';
import PromptEditorField from './prompt-editor-field';

export default function AssistantHistory({
  projectId,
  gitRef,
  value,
  readOnly = undefined,
  parameter,
}: {
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  parameter: ParameterYjs;
}) {
  const { t } = useLocaleContext();

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'history') {
    const { source } = parameter;
    source.chatHistory ??= { limit: 50, keyword: '' };

    return (
      <>
        <Box>
          <Typography variant="subtitle2">{t('history.limit')}</Typography>

          <Box
            sx={{
              flex: 1,
            }}>
            <SliderNumberField
              min={1}
              max={100}
              step={1}
              sx={{ flex: 1 }}
              value={source.chatHistory?.limit ?? 50}
              onChange={(_, v) => {
                if (source.chatHistory) {
                  source.chatHistory.limit = v;
                }
              }}
            />
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2">{t('history.keyword')}</Typography>

          <Box
            sx={{
              flex: 1,
            }}>
            <PromptEditorField
              readOnly={readOnly}
              projectId={projectId}
              gitRef={gitRef}
              ContentProps={{ sx: { px: 1, py: 0.5 } }}
              path={[value.id, 'history']}
              assistant={value}
              value={source.chatHistory?.keyword ?? ''}
              onChange={(prompt) => {
                if (source.chatHistory) {
                  source.chatHistory.keyword = prompt;
                }
              }}
            />
          </Box>
        </Box>
      </>
    );
  }

  return null;
}
