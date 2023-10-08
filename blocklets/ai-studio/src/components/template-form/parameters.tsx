import { SettingsRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  ClickAwayListener,
  Paper,
  Popper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useDeferredValue, useEffect, useRef, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Parameter } from '../../../api/src/store/templates';
import ParameterConfig from './parameter-config';

export default function Parameters({ form }: { form: Pick<TemplateYjs, 'type' | 'name' | 'prompts' | 'parameters'> }) {
  const deferredValue = useDeferredValue(form);

  const params = (() => {
    const params = Object.values(deferredValue.prompts ?? {})?.flatMap((i) => matchParams(i.data.content ?? '')) ?? [];
    if (deferredValue.type === 'branch') {
      params.push('question');
    }
    if (deferredValue.type === 'image') {
      params.push('size');
      params.push('number');
    }
    return [...new Set(params)];
  })();

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
      <Box
        sx={{
          border: (theme) => `1px solid ${theme.palette.grey[200]}`,
          borderRadius: 2,
          overflow: 'hidden',
          table: {
            tableLayout: 'fixed',
          },
          th: {
            color: 'text.secondary',
          },
          'tbody > tr:last-of-type > td': {
            border: 'none',
          },
          'th,td': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderColor: 'grey.200',

            '&:nth-of-type(3), &:nth-of-type(4)': {
              textAlign: 'center',
            },
          },
        }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variable</TableCell>
              <TableCell>Label</TableCell>
              <TableCell width="100">Type</TableCell>
              <TableCell width="80">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {params.map((param) => {
              const parameter = form.parameters?.[param];
              if (!parameter) {
                return null;
              }

              return (
                <TableRow key={param}>
                  <TableCell>{param}</TableCell>
                  <TableCell>{parameter.label}</TableCell>
                  <TableCell>{parameter.type || 'string'}</TableCell>
                  <TableCell>
                    <Button
                      sx={{ minWidth: 0, p: 0.5, borderRadius: 100 }}
                      onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, param })}>
                      <SettingsRounded sx={{ fontSize: 14, color: 'text.secondary' }} />
                    </Button>
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
