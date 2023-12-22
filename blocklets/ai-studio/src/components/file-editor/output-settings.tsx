import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, MenuItem, Stack, Typography } from '@mui/material';

import IndicatorTextField from '../awareness/indicator-text-field';

export default function OutputSettings({
  value,
  readOnly,
  projectId,
  gitRef,
}: {
  value: AssistantYjs;
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="subtitle1">{t('formatResult')}</Typography>

        <IndicatorTextField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, value.formatResultType ?? 'none']}
          textFiledProps={{
            select: true,
            hiddenLabel: true,
            SelectProps: {
              autoWidth: true,
              readOnly,
            },
            value: value.formatResultType || 'none',
            onChange: (e) => (value.formatResultType = e.target.value as any),
            children: [<MenuItem value="none">{t('stayAsIs')}</MenuItem>],
          }}
        />
      </Stack>
    </Box>
  );
}
