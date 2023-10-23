import { getAllVariables } from '@blocklet/prompt-editor/utils';
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
import { useDeferredValue, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import Settings from '../../pages/project/icons/settings';
import ParameterConfig from './parameter-config';

export default function Parameters({
  readOnly,
  form,
}: {
  readOnly?: boolean;
  form: Pick<TemplateYjs, 'type' | 'name' | 'prompts' | 'parameters'>;
}) {
  // TODO: parameters 支持自定义顺序，到时候可以去掉这个实时 match params 的逻辑，直接渲染 template.parameters 数据即可
  const deferredValue = useDeferredValue(form);

  const params = (() => {
    const params =
      Object.values(deferredValue.prompts ?? {})?.flatMap((i) =>
        matchParams(getAllVariables(i.data.contentLexicalJson ?? '').join(''))
      ) ?? [];

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

  return (
    <>
      <Box
        sx={{
          border: (theme) => `1px solid ${theme.palette.grey[200]}`,
          borderRadius: 1,
          overflow: 'hidden',
          table: {
            tableLayout: 'fixed',
          },
          th: {
            color: 'text.secondary',
            border: 'none',
          },
          td: {
            borderTop: '1px solid transparent',
            borderTopColor: 'grey.200',
            borderBottom: 'none',
          },
          'th,td': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',

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
                      <Settings fontSize="small" sx={{ color: 'text.secondary' }} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Popper open={Boolean(paramConfig)} anchorEl={paramConfig?.anchorEl} placement="bottom-end" sx={{ zIndex: 1200 }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setParamConfig(undefined);
          }}>
          <Paper sx={{ p: 3, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            {paramConfig && <ParameterConfig readOnly={readOnly} value={form.parameters![paramConfig.param]!} />}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

export const matchParams = (template: string) => [
  ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
];
