import IndicatorTextField from '@app/components/awareness/indicator-text-field';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, MenuItem, Stack } from '@mui/material';
import { useMemo } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

export default function ApiAssistantSetting({
  value,
  readOnly,
  projectId,
  gitRef,
  compareValue,
  isRemoteCompare,
}: {
  value: ApiAssistantYjs;
  projectId: string;
  gitRef: string;
  compareValue?: ApiAssistantYjs;
  isRemoteCompare?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const methods = useMemo(() => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], []);

  return (
    <Box sx={{ border: '1px solid #3B82F6', p: '8px 16px', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Stack
        sx={{
          py: 1,
          gap: 1,
        }}>
        <Stack
          direction="row"
          sx={{
            gap: 1,
          }}>
          <IndicatorTextField
            projectId={projectId}
            gitRef={gitRef}
            path={[value.id, 'requestMethod']}
            TextFiledProps={{
              label: t('method'),
              select: true,
              SelectProps: {
                autoWidth: true,
              },
              InputProps: {
                readOnly,
                sx: { backgroundColor: { ...getDiffBackground('requestMethod') } },
              },
              value: value.requestMethod || methods[0],
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                (value.requestMethod = e.target.value),
              children: methods.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              )),
            }}
          />
          <Box
            sx={{
              flex: 1,
            }}>
            <IndicatorTextField
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'requestUrl']}
              TextFiledProps={{
                sx: { flex: 1, width: 1 },
                label: t('url'),
                InputProps: {
                  readOnly,
                  sx: { backgroundColor: { ...getDiffBackground('requestUrl') } },
                },
                value: value.requestUrl ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  (value.requestUrl = e.target.value),
              }}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
