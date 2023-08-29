import { SettingsOutlined } from '@mui/icons-material';
import {
  Box,
  ClickAwayListener,
  IconButton,
  Paper,
  Popper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { Parameter, Template } from '../../../api/src/store/templates';
import ParameterConfig from './parameter-config';

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
    if (deferredValue.type === 'image') {
      params.push('size');
      params.push('number');
    }
    return [...new Set(params)];
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
        if (value.type === 'image' && ['size', 'number'].includes(key)) {
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
      <Box sx={{ border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="right" width={80}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ 'tr:last-of-type > td': { borderBottom: 'none' } }}>
            {params.map((param) => {
              const parameter = value.parameters?.[param];
              if (!parameter) {
                return null;
              }

              return (
                <TableRow key={param}>
                  <TableCell>{param}</TableCell>
                  <TableCell>{parameter.label}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      sx={{ m: 0, p: 0.5 }}
                      size="small"
                      onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, param })}>
                      <SettingsOutlined sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

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
