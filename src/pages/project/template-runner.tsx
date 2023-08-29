import { Box, Card, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useDeferredValue, useMemo } from 'react';

import { Template } from '../../../api/src/store/templates';
import ParameterField from '../../components/parameter-field';
import { matchParams } from '../../components/template-form/parameters';

export default function TemplateRunner({ template }: { template: Template }) {
  const deferredValue = useDeferredValue(template);

  const params = useMemo(() => {
    const params = deferredValue.prompts?.flatMap((i) => matchParams(i.content ?? '')) ?? [];
    if (deferredValue.type === 'branch') {
      params.push('question');
    }
    if (deferredValue.type === 'image') {
      params.push('size');
      params.push('number');
    }
    return [...new Set(params)];
  }, [deferredValue]);

  return (
    <div>
      <Box textAlign="center">
        <ToggleButtonGroup exclusive value="play" color="primary">
          <ToggleButton value="play">Play</ToggleButton>
          <ToggleButton value="test" disabled>
            Test
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card sx={{ p: 2, my: 2 }} elevation={1}>
        <Typography variant="h6" fontWeight="bold" sx={{ my: 2 }}>
          Variables
        </Typography>

        <Stack gap={2}>
          {params.map((param) => {
            const parameter = template.parameters?.[param];
            if (!parameter) return null;

            return (
              <ParameterField
                key={param}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1 } }}
                label={parameter.label || param}
                parameter={parameter}
                onChange={() => {}}
              />
            );
          })}
        </Stack>
      </Card>
    </div>
  );
}
