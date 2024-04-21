import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { ExpandMoreRounded } from '@mui/icons-material';
import { Box, Button, Checkbox, Collapse, MenuItem, Stack, TextField, TextFieldProps, Typography } from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';
import { useState } from 'react';

export default function OutputSettings({ value, isOpen = true }: { value: AssistantYjs; isOpen?: boolean }) {
  const { t } = useLocaleContext();

  const [open, setOpen] = useState(isOpen);

  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

  return (
    <Box sx={{ border: '1px solid #E5E7EB', px: 1, py: 2, borderRadius: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        sx={{ cursor: 'pointer', px: 1 }}
        gap={1}
        onClick={() => setOpen(!open)}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 500,
          }}>
          {t('outputVariables')}
        </Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end" />

        <Stack direction="row" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
          <Typography variant="subtitle4">Output Format</Typography>

          <TextField
            size="small"
            hiddenLabel
            select
            SelectProps={{ autoWidth: true }}
            value={value.outputFormat || 'text'}
            onChange={(e) => {
              value.outputFormat = e.target.value as any;
            }}>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="json">JSON</MenuItem>
          </TextField>
        </Stack>

        <ExpandMoreRounded
          sx={{
            transform: !open ? 'rotateZ(270deg)' : 'rotateZ(360deg)',
            transition: (theme) => theme.transitions.create('all'),
            fontSize: 18,
            color: '#030712',
          }}
        />
      </Stack>

      <Collapse in={open}>
        <Box component="table">
          <thead>
            <tr>
              <Box component="th">Variable</Box>
              <Box component="th">Description</Box>
              <Box component="th" align="center">
                Type
              </Box>
              <Box component="th" align="center">
                Required
              </Box>
              <Box component="th" align="center">
                Default Value
              </Box>
              <Box component="th">Setting</Box>
            </tr>
          </thead>
          <tbody>
            {outputVariables?.map((variable) => (
              <VariableRow
                key={variable.data.id}
                variable={variable.data}
                onRemove={() =>
                  setField(() => {
                    delete value.outputVariables?.[variable.data.id];
                  })
                }
              />
            ))}
          </tbody>
        </Box>

        <Button
          sx={{ minWidth: 32, minHeight: 32, p: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            setField((vars) => {
              const id = nanoid();
              vars[id] = { index: Object.values(vars).length, data: { id, type: 'string' } };
            });
          }}>
          <Icon icon="tabler:plus" />
        </Button>
      </Collapse>
    </Box>
  );
}

function VariableRow({
  variable,
  depth = 0,
  onRemove,
}: {
  variable: OutputVariableYjs;
  depth?: number;
  onRemove?: () => void;
}) {
  const doc = (getYjsValue(variable) as Map<any>).doc!;

  return (
    <>
      <tr key={variable.id}>
        <Box component="td">
          <Box sx={{ ml: depth }}>
            <TextField
              fullWidth
              hiddenLabel
              placeholder="Name"
              value={variable.name || ''}
              onChange={(e) => (variable.name = e.target.value)}
            />
          </Box>
        </Box>
        <Box component="td">
          <TextField
            fullWidth
            hiddenLabel
            placeholder="Description"
            value={variable.description || ''}
            onChange={(e) => (variable.description = e.target.value)}
          />
        </Box>
        <Box component="td" align="center">
          <VariableTypeField
            value={variable.type || 'string'}
            onChange={(e) => {
              variable.type = e.target.value as any;
              if (variable.type === 'array') {
                variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
              }
            }}
          />
        </Box>
        <Box component="td" align="center">
          <Checkbox
            checked={variable.required || false}
            onChange={(_, checked) => {
              variable.required = checked;
            }}
          />
        </Box>
        <Box component="td" align="center">
          {variable.type === 'string' ? (
            <TextField
              hiddenLabel
              fullWidth
              multiline
              value={variable.defaultValue || ''}
              onChange={(e) => (variable.defaultValue = e.target.value)}
            />
          ) : variable.type === 'number' ? (
            <NumberField
              hiddenLabel
              fullWidth
              value={variable.defaultValue || null}
              onChange={(value) => (variable.defaultValue = value)}
            />
          ) : null}
        </Box>
        <td align="right">
          <Stack direction="row" gap={1} justifyContent="flex-end">
            {variable.type === 'object' && (
              <Button
                sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                onClick={() => {
                  doc.transact(() => {
                    variable.properties ??= {};
                    const id = nanoid();
                    variable.properties[id] = {
                      index: Object.values(variable.properties).length,
                      data: { id, type: 'string' },
                    };
                    sortBy(Object.values(variable.properties), 'index').forEach((item, index) => (item.index = index));
                  });
                }}>
                <Icon icon="tabler:plus" />
              </Button>
            )}

            {onRemove && (
              <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onRemove}>
                <Icon icon="tabler:minus" />
              </Button>
            )}
          </Stack>
        </td>
      </tr>

      {variable.type === 'object' &&
        variable.properties &&
        sortBy(Object.values(variable.properties), 'index').map((property) => (
          <VariableRow
            key={property.data.id}
            variable={property.data}
            depth={depth + 1}
            onRemove={() => {
              doc.transact(() => {
                if (!variable.properties) return;
                delete variable.properties[property.data.id];
                sortBy(Object.values(variable.properties), 'index').forEach((item, index) => (item.index = index));
              });
            }}
          />
        ))}

      {variable.type === 'array' && variable.element && <VariableRow variable={variable.element} depth={depth + 1} />}
    </>
  );
}

function VariableTypeField({ ...props }: TextFieldProps) {
  return (
    <TextField hiddenLabel placeholder="Type" select SelectProps={{ autoWidth: true }} {...props}>
      <MenuItem value="string">String</MenuItem>
      <MenuItem value="number">Number</MenuItem>
      <MenuItem value="object">Object</MenuItem>
      <MenuItem value="array">Array</MenuItem>
    </TextField>
  );
}
