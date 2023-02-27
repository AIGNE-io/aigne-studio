import styled from '@emotion/styled';
import { Add, Delete } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  Input,
  MenuItem,
  Switch,
  TextField,
  TextFieldProps,
} from '@mui/material';
import { useReactive } from 'ahooks';
import equal from 'fast-deep-equal';
import { nanoid } from 'nanoid';
import { ChangeEvent, useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Parameter, SelectParameter } from '../../../api/src/store/templates';
import { DragSortListItem } from '../drag-sort';

export default function ParameterConfig({
  value,
  onChange,
}: {
  value: Parameter;
  onChange: (value: Parameter) => void;
}) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="Type"
          size="small"
          select
          value={value.type ?? 'string'}
          onChange={(e) => onChange({ ...value, type: e.target.value as any })}>
          <MenuItem value="string">Text</MenuItem>
          <MenuItem value="number">Number</MenuItem>
          <MenuItem value="select">Select</MenuItem>
          <MenuItem value="language">Language</MenuItem>
        </TextField>
      </Grid>
      {(!value.type || value.type === 'string') && (
        <Grid item xs={6} display="flex" alignItems="center" minHeight="100%" justifyContent="flex-end">
          <FormControlLabel
            label="Multiline"
            control={<Checkbox />}
            checked={value.multiline ?? false}
            onChange={(_, multiline) => onChange({ ...value, multiline })}
          />
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Label"
          size="small"
          value={value.label || ''}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Placeholder"
          size="small"
          value={value.placeholder || ''}
          onChange={(e) => onChange({ ...value, placeholder: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Helper"
          size="small"
          value={value.helper || ''}
          onChange={(e) => onChange({ ...value, helper: e.target.value })}
        />
      </Grid>
      {value.type === 'select' && (
        <Grid item xs={12}>
          <SelectOptionsConfig options={value.options} onChange={(options) => onChange({ ...value, options })} />
        </Grid>
      )}
      <Grid item xs={12}>
        <FormControl>
          <FormControlLabel
            label="Required"
            control={
              <Switch checked={value.required || false} onChange={(_, required) => onChange({ ...value, required })} />
            }
          />
        </FormControl>
      </Grid>
      {(!value.type || value.type === 'string') && (
        <>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Min Length"
              size="small"
              min={1}
              value={value.minLength ?? ''}
              onChange={(val) => onChange({ ...value, minLength: val })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Max Length"
              size="small"
              min={1}
              value={value.maxLength ?? ''}
              onChange={(val) => onChange({ ...value, maxLength: val })}
            />
          </Grid>
        </>
      )}
      {value.type === 'number' && (
        <>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Min"
              size="small"
              value={value.min ?? ''}
              onChange={(min) => onChange({ ...value, min })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Max"
              size="small"
              value={value.max ?? ''}
              onChange={(max) => onChange({ ...value, max })}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}

export function NumberField({
  min,
  max,
  default: def,
  onChange,
  ...props
}: { min?: number; max?: number; default?: number; onChange?: (value?: number) => void } & Omit<
  TextFieldProps,
  'onChange'
>) {
  const correctValue = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value.trim();
    if (!value) {
      return def;
    }
    let num = Number(Number(value).toFixed(0));
    if (!Number.isInteger(num)) {
      return def;
    }

    if (typeof min === 'number') {
      num = Math.max(min, num);
    }
    if (typeof max === 'number') {
      num = Math.min(max, num);
    }
    return num;
  };

  return (
    <TextField
      onChange={(e) => onChange?.(correctValue(e))}
      inputProps={{
        type: 'number',
        inputMode: 'numeric',
        pattern: '[0-9]*',
        min,
        max,
        ...props.inputProps,
      }}
      {...props}
    />
  );
}

function SelectOptionsConfig({
  options,
  onChange,
}: {
  options: SelectParameter['options'];
  onChange: (options: SelectParameter['options']) => void;
}) {
  const init = useMemo<NonNullable<typeof options>>(() => (options && JSON.parse(JSON.stringify(options))) ?? [], []);

  const data = useReactive(init);

  useEffect(() => {
    const newOptions = JSON.parse(JSON.stringify(data));
    if (!equal(newOptions, options)) {
      onChange(newOptions);
    }
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        {data.map((option, index) => (
          <DragSortListItem
            sx={{ my: 0.5 }}
            key={option.id}
            dragType="SELECT_OPTION"
            dropType={['SELECT_OPTION']}
            id={option.id}
            index={index}
            move={(id, toIndex) => {
              const srcIndex = data.findIndex((i) => i.id === id);
              data.splice(toIndex, 0, ...data.splice(srcIndex, 1));
            }}
            actions={
              <Box onClick={() => data.splice(index, 1)}>
                <Delete />
              </Box>
            }>
            <SelectOptionConfigItem>
              <Input
                inputProps={{ id: `option-label-${option.id}` }}
                disableUnderline
                placeholder="Label"
                value={option.label}
                onChange={(e) => (option.label = e.target.value)}
              />
              <Input
                sx={{ ml: 0.5 }}
                disableUnderline
                placeholder="Value"
                value={option.value}
                onChange={(e) => (option.value = e.target.value)}
              />
            </SelectOptionConfigItem>
          </DragSortListItem>
        ))}

        <Button
          fullWidth
          size="small"
          startIcon={<Add />}
          onClick={() => {
            const id = nanoid(16);
            data.push({ id, label: '', value: '' });
            setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
          }}>
          Add Option
        </Button>
      </Box>
    </DndProvider>
  );
}

const SelectOptionConfigItem = styled(Box)`
  display: flex;
  align-items: center;

  .MuiInput-root {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    flex: 1;

    input {
      padding: 4px 4px;
    }
  }
`;
