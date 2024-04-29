import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs } from '@blocklet/ai-runtime/types';
import { Box, Typography } from '@mui/material';

import SliderNumberField from '../slider-number-field';
import PromptEditorField from './prompt-editor-field';

export default function AssistantHistory({
  projectId,
  gitRef,
  value,
  readOnly,
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
    source.memory ??= { limit: 50, keyword: '' };

    return (
      <>
        <Box>
          <Typography variant="subtitle2">{t('history.limit')}</Typography>

          <Box flex={1}>
            <SliderNumberField
              min={1}
              max={100}
              step={1}
              sx={{ flex: 1 }}
              value={source.memory?.limit ?? 50}
              onChange={(_, v) => {
                if (source.memory) {
                  source.memory.limit = v;
                }
              }}
            />
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('history.keyword')}</Typography>

          <Box flex={1}>
            <PromptEditorField
              readOnly={readOnly}
              projectId={projectId}
              gitRef={gitRef}
              ContentProps={{ sx: { px: 1, py: 0.5 } }}
              path={[value.id, 'history']}
              assistant={value}
              value={source.memory?.keyword ?? ''}
              onChange={(prompt) => {
                if (source.memory) {
                  source.memory.keyword = prompt;
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
