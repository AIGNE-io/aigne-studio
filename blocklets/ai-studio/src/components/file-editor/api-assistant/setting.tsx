import { ExpandMoreRounded } from '@mui/icons-material';
import { Box, Button, Collapse, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ApiFileYjs } from 'api/src/store/projects';
import { useMemo, useState } from 'react';

export default function ApiAssistantSetting({ value, readOnly }: { value: ApiFileYjs; readOnly?: boolean }) {
  const methods = useMemo(() => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], []);

  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle1">Call API</Typography>

        <Box flex={1} overflow="hidden">
          {!open && (
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography component="span" sx={{ bgcolor: 'grey.300', px: 1, borderRadius: 1 }}>
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
              label="Method"
              select
              SelectProps={{ autoWidth: true }}
              InputProps={{ readOnly }}
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
              label="Url"
              InputProps={{ readOnly }}
              value={value.requestUrl || ''}
              onChange={(e) => (value.requestUrl = e.target.value)}
            />
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
