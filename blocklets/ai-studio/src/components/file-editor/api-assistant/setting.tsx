import IndicatorTextField from '@app/components/awareness/indicator-text-field';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { ExpandMoreRounded } from '@mui/icons-material';
import { Box, Collapse, MenuItem, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

export default function ApiAssistantSetting({
  value,
  readOnly,
  projectId,
  gitRef,
  compareValue,
  isRemoteCompare,
  isOpen,
}: {
  value: ApiAssistantYjs;
  projectId: string;
  gitRef: string;
  compareValue?: ApiAssistantYjs;
  isRemoteCompare?: boolean;
  isOpen?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const [open, setOpen] = useState(isOpen);
  const methods = useMemo(() => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], []);

  return (
    <Box sx={{ border: '1px solid #E5E7EB', p: '8px 16px', borderRadius: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '24px',
          color: '#030712',
          cursor: 'pointer',
        }}
        onClick={() => setOpen(!open)}>
        <Typography variant="subtitle2">{t('callAPI')}</Typography>

        <Box flex={1} overflow="hidden">
          {!open && (
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                p: 1,
                borderRadius: 1,
                backgroundColor: { ...getDiffBackground('requestMethod'), ...getDiffBackground('requestUrl') },
              }}>
              <Typography component="span" sx={{ bgcolor: 'grey.300', borderRadius: 1 }}>
                {value.requestMethod}
              </Typography>
              <Typography component="span" flex={1} noWrap>
                {value.requestUrl}
              </Typography>
            </Stack>
          )}
        </Box>

        <ExpandMoreRounded
          sx={{
            transform: open ? 'rotateZ(180deg)' : undefined,
            transition: (theme) => theme.transitions.create('all'),
          }}
        />
      </Stack>

      <Collapse in={open}>
        <Stack py={1} gap={1}>
          <Stack direction="row" gap={1}>
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
            <Box flex={1}>
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
      </Collapse>
    </Box>
  );
}
