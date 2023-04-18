import { Settings } from '@mui/icons-material';
import { Box, ClickAwayListener, Grid, IconButton, Paper, Popper } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { Parameter, Template } from '../../../api/src/store/templates';
import ParameterField from '../parameter-field';
import ParameterConfig from './parameter-config';
import TokenCounter from './token-counter';

export default function Parameters({
  value,
  onChange,
}: {
  value: Pick<Template, 'type' | 'name' | 'prompts' | 'parameters'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
}) {
  const deferredValue = useDeferredValue(value);

  const params = useMemo(() => {
    const params = deferredValue.prompts?.flatMap((i) => matchParams(i.content ?? '')) ?? [];
    if (deferredValue.type === 'branch') {
      params.push('question');
    }
    return params;
  }, [deferredValue]);

  const [paramConfig, setParamConfig] = useState<{ anchorEl: HTMLElement; param: string }>();

  const parametersHistory = useRef<Record<string, Parameter>>({});

  useEffect(() => {
    onChange((template) => {
      if (!template.parameters && params.length === 0) {
        return;
      }

      template.parameters ??= {};
      for (const param of params) {
        const history = parametersHistory.current[param];
        template.parameters[param] ??= history ?? {};
      }
      for (const [key, val] of Object.entries(template.parameters)) {
        if (value.type === 'branch' && key === 'question') {
          continue;
        }
        if (!params.includes(key)) {
          delete template.parameters[key];
          parametersHistory.current[key] = JSON.parse(JSON.stringify(val));
        }
      }
    });
  }, [params]);

  return (
    <>
      <Grid container spacing={2}>
        {params.map((param) => {
          const parameter = value.parameters?.[param];
          if (!parameter) {
            return null;
          }

          return (
            <Grid item xs={12} key={param}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <ParameterField
                  key={param}
                  sx={{ flex: 1 }}
                  size="small"
                  label={parameter.label || param}
                  parameter={parameter}
                  helperText={
                    <Box component="span" sx={{ display: 'flex' }}>
                      <Box component="span" sx={{ flex: 1, overflow: 'hidden' }}>
                        {parameter.helper}
                      </Box>
                      <TokenCounter value={parameter} />
                    </Box>
                  }
                  value={parameter.value ?? parameter.defaultValue ?? ''}
                  onChange={(value) => onChange((v) => (v.parameters![param]!.value = value))}
                />
                <IconButton
                  sx={{ ml: 2, mt: 0.5 }}
                  size="small"
                  onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, param })}>
                  <Settings fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Popper
        open={Boolean(paramConfig)}
        modifiers={[
          {
            name: 'preventOverflow',
            enabled: true,
            options: {
              altAxis: true,
              altBoundary: true,
              tether: true,
              rootBoundary: 'document',
              padding: 8,
            },
          },
        ]}
        anchorEl={paramConfig?.anchorEl}
        translate="no"
        transition={false}
        placement="bottom-end"
        sx={{ zIndex: 1200 }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setParamConfig(undefined);
          }}>
          <Paper elevation={11} sx={{ p: 3, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            {paramConfig && (
              <ParameterConfig
                value={value.parameters![paramConfig.param]!}
                onChange={(parameter) => onChange((v) => (v.parameters![paramConfig.param] = parameter))}
              />
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

export const matchParams = (template: string) => [
  ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
];
