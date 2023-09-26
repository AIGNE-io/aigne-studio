import { Settings } from '@mui/icons-material';
import { Box, ClickAwayListener, Grid, IconButton, Paper, Popper } from '@mui/material';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Parameter } from '../../../api/src/store/templates';
import ParameterField from '../parameter-field';
import ParameterConfig from './parameter-config';
import TokenCounter from './token-counter';

export default function Parameters({ form }: { form: Pick<TemplateYjs, 'type' | 'name' | 'prompts' | 'parameters'> }) {
  const deferredValue = useDeferredValue(form);

  const params = useMemo(() => {
    const params = Object.values(deferredValue.prompts ?? {})?.flatMap((i) => matchParams(i.data.content ?? '')) ?? [];
    if (deferredValue.type === 'branch') {
      params.push('question');
    }
    if (deferredValue.type === 'image') {
      params.push('size');
      params.push('number');
    }
    return [...new Set(params)];
  }, [deferredValue]);

  const [paramConfig, setParamConfig] = useState<{ anchorEl: HTMLElement; param: string }>();

  const parametersHistory = useRef<Record<string, Parameter>>({});

  useEffect(() => {
    if (!form.parameters && params.length === 0) {
      return;
    }

    form.parameters ??= {};
    for (const param of params) {
      const history = parametersHistory.current[param];
      form.parameters[param] ??= history ?? {};
    }
    for (const [key, val] of Object.entries(form.parameters)) {
      if (form.type === 'branch' && key === 'question') {
        continue;
      }
      if (form.type === 'image' && ['size', 'number'].includes(key)) {
        continue;
      }
      if (!params.includes(key)) {
        delete form.parameters[key];
        parametersHistory.current[key] = JSON.parse(JSON.stringify(val));
      }
    }
  }, [params]);

  return (
    <>
      <Grid container spacing={2}>
        {params.map((param) => {
          const parameter = form.parameters?.[param];
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
                  onChange={(value) => (form.parameters![param]!.value = value)}
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
                value={form.parameters![paramConfig.param]!}
                onChange={(parameter) => (form.parameters![paramConfig.param] = parameter)}
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
