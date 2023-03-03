import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
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
} from '@mui/material';
import { useReactive } from 'ahooks';
import equal from 'fast-deep-equal';
import { nanoid } from 'nanoid';
import { useEffect, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Parameter, SelectParameter } from '../../../api/src/store/templates';
import { DragSortListItem } from '../drag-sort';
import NumberField from './number-field';
import ParameterField from './parameter-field';

export default function ParameterConfig({
  value,
  onChange,
}: {
  value: Parameter;
  onChange: (value: Parameter) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label={t('form.parameter.type')}
          size="small"
          select
          value={value.type ?? 'string'}
          onChange={(e) => onChange({ ...value, type: e.target.value as any })}>
          <MenuItem value="string">{t('form.parameter.typeText')}</MenuItem>
          <MenuItem value="number">{t('form.parameter.typeNumber')}</MenuItem>
          <MenuItem value="select">{t('form.parameter.typeSelect')}</MenuItem>
          <MenuItem value="language">{t('form.parameter.typeLanguage')}</MenuItem>
        </TextField>
      </Grid>
      {(!value.type || value.type === 'string') && (
        <Grid item xs={6} display="flex" alignItems="center" minHeight="100%" justifyContent="flex-end">
          <FormControlLabel
            label={t('form.parameter.multiline')}
            control={<Checkbox />}
            checked={value.multiline ?? false}
            onChange={(_, multiline) => onChange({ ...value, multiline })}
          />
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.label')}
          size="small"
          value={value.label || ''}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.placeholder')}
          size="small"
          value={value.placeholder || ''}
          onChange={(e) => onChange({ ...value, placeholder: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.helper')}
          size="small"
          value={value.helper || ''}
          onChange={(e) => onChange({ ...value, helper: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <ParameterField
          parameter={value}
          fullWidth
          label={t('form.parameter.defaultValue')}
          size="small"
          value={value.defaultValue ?? ''}
          onChange={(defaultValue: any) => onChange({ ...value, defaultValue })}
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
            label={t('form.parameter.required')}
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
              label={t('form.parameter.minLength')}
              size="small"
              min={1}
              value={value.minLength ?? ''}
              onChange={(val) => onChange({ ...value, minLength: val })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.maxLength')}
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
              label={t('form.parameter.min')}
              size="small"
              value={value.min ?? ''}
              onChange={(min) => onChange({ ...value, min })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.max')}
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

function SelectOptionsConfig({
  options,
  onChange,
}: {
  options: SelectParameter['options'];
  onChange: (options: SelectParameter['options']) => void;
}) {
  const { t } = useLocaleContext();

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
                placeholder={t('form.parameter.label')}
                value={option.label}
                onChange={(e) => (option.label = e.target.value)}
              />
              <Input
                sx={{ ml: 0.5 }}
                disableUnderline
                placeholder={t('form.parameter.value')}
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
          {t('form.parameter.addOption')}
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
