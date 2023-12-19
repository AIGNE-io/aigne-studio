import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { ExpandMoreRounded } from '@mui/icons-material';
import { Box, Button, Collapse, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

export default function ApiAssistantSetting({
  value,
  readOnly,
  compareValue,
  isRemoteCompare,
  isOpen,
}: {
  value: ApiAssistantYjs;
  readOnly?: boolean;
  compareValue?: ApiAssistantYjs;
  isRemoteCompare?: boolean;
  isOpen?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const [open, setOpen] = useState(isOpen);
  const methods = useMemo(() => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle1">{t('callAPI')}</Typography>

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

        <Button sx={{ minWidth: 32, minHeight: 32, p: 0 }} onClick={() => setOpen(!open)}>
          <ExpandMoreRounded
            sx={{
              transform: open ? 'rotateZ(180deg)' : undefined,
              transition: (theme) => theme.transitions.create('all'),
            }}
          />
        </Button>
      </Stack>

      <Collapse in={open}>
        <Stack py={1} gap={1}>
          <Stack direction="row" gap={1}>
            <TextField
              label={t('method')}
              select
              SelectProps={{ autoWidth: true }}
              InputProps={{
                readOnly,
                sx: { backgroundColor: { ...getDiffBackground('requestMethod') } },
              }}
              value={value.requestMethod || methods[0]}
              onChange={(e) => (value.requestMethod = e.target.value)}>
              {methods.map((method) => (
                <MenuItem key={method} value={method}>
                  {method}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              sx={{ flex: 1 }}
              label={t('url')}
              InputProps={{
                readOnly,
                sx: { backgroundColor: { ...getDiffBackground('requestUrl') } },
              }}
              value={value.requestUrl || ''}
              onChange={(e) => (value.requestUrl = e.target.value)}
            />
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
