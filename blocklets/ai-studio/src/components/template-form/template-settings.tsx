import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { InfoOutlined } from '@mui/icons-material';
import {
  Box,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stack,
  StackProps,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  outlinedInputClasses,
} from '@mui/material';
import { ChangeEvent } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import Datasets from './datasets';
import Next from './next';

const MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k-0613'];

export default function TemplateSettings({
  projectId,
  gitRef,
  value,
}: {
  projectId: string;
  gitRef: string;
  value: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  return (
    <Table
      sx={{
        td: {
          px: 0,
          py: 1,
          border: 'none',
          ':first-of-type': {
            whiteSpace: 'nowrap',
          },
          ':nth-of-type(2)': {
            pl: 2,
            width: '100%',
            position: 'relative',
          },
        },
      }}>
      <TableBody>
        <TableRow>
          <TableCell>
            <FormLabel>{t('form.type')}</FormLabel>
          </TableCell>

          <TableCell>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'name']}>
              <RadioGroup
                row
                value={value.type ?? 'text'}
                onChange={(_, type) => {
                  if (type === 'text') {
                    delete value.type;
                  } else {
                    value.type = type as any;
                  }
                }}>
                <FormControlLabel value="text" control={<Radio />} label={t('text')} />
                <FormControlLabel value="image" control={<Radio />} label={t('image')} />
              </RadioGroup>
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'name']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell>
            <FormLabel>{t('model')}</FormLabel>
          </TableCell>

          <TableCell colSpan={2}>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
              <Select
                size="small"
                fullWidth
                value={value.model ?? ''}
                onChange={(e) => (value.model = e.target.value)}
                sx={{
                  [`.${outlinedInputClasses.notchedOutline}`]: { border: 'none' },
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                }}>
                {MODELS.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'model']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell>
            <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
              <FormLabel>
                {t('temperature')}
                <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
              </FormLabel>
            </Tooltip>
          </TableCell>

          <TableCell>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'temperature']}>
              <SliderNumberField
                min={0}
                max={2}
                step={0.1}
                sx={{ flex: 1 }}
                value={value.temperature ?? 1}
                onChange={(_, v) => (value.temperature = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'temperature']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell>
            <Tooltip title={t('topPTip')} placement="top" disableInteractive>
              <FormLabel>
                {t('topP')}
                <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
              </FormLabel>
            </Tooltip>
          </TableCell>

          <TableCell>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'topP']}>
              <SliderNumberField
                min={0.1}
                max={1}
                step={0.1}
                value={value.topP ?? 1}
                onChange={(_, v) => (value.topP = v)}
                sx={{ flex: 1 }}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'topP']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell>
            <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
              <FormLabel>
                {t('presencePenalty')}
                <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
              </FormLabel>
            </Tooltip>
          </TableCell>

          <TableCell>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'presencePenalty']}>
              <SliderNumberField
                min={-2}
                max={2}
                step={0.1}
                sx={{ flex: 1 }}
                value={value.presencePenalty ?? 1}
                onChange={(_, v) => (value.presencePenalty = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'presencePenalty']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell>
            <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
              <FormLabel>
                {t('frequencyPenalty')}
                <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
              </FormLabel>
            </Tooltip>
          </TableCell>

          <TableCell>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'frequencyPenalty']}>
              <SliderNumberField
                min={-2}
                max={2}
                step={0.1}
                sx={{ flex: 1 }}
                value={value.frequencyPenalty ?? 1}
                onChange={(_, v) => (value.frequencyPenalty = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'frequencyPenalty']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell colSpan={2}>
            <Datasets form={value} />
          </TableCell>
        </TableRow>

        {value.type !== 'image' && (
          <TableRow>
            <TableCell colSpan={2}>
              <Next projectId={projectId} gitRef={gitRef} form={value} />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function SliderNumberField({
  value,
  min,
  max,
  step,
  onChange,
  ...props
}: {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (e: Event | ChangeEvent<HTMLInputElement>, value?: number) => any;
} & Omit<StackProps, 'onChange'>) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      <Slider
        min={min}
        max={max}
        step={step}
        size="small"
        sx={{ flex: 1, mr: 2, ml: 1 }}
        value={value}
        onChange={(e, v) => {
          if (!Array.isArray(v)) onChange?.(e, v);
        }}
      />

      <Box
        component="input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (Number.isNaN(v)) v = 0;
          if (typeof min === 'number') v = Math.max(min, v);
          if (typeof max === 'number') v = Math.min(max, v);

          onChange?.(e, v);
        }}
        sx={{ width: 50, border: 'none', bgcolor: 'grey.100', lineHeight: 1.5, px: 1, py: 0.5, borderRadius: 2 }}
      />
    </Stack>
  );
}
