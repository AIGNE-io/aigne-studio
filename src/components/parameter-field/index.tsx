import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Remove } from '@mui/icons-material';
import { Box, Button, FormHelperText, InputAdornment, MenuItem, TextField, TextFieldProps } from '@mui/material';
import { DateTimePicker, DateTimePickerProps, TimePicker, TimePickerProps } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Horoscope, Origin } from 'circular-natal-horoscope-js/dist';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import equal from 'fast-deep-equal';
import { isNil } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import tzlookup from 'tz-lookup';

import {
  HoroscopeParameter,
  NumberParameter,
  Parameter,
  SelectParameter,
  StringParameter,
} from '../../../api/src/store/templates';
import NominatimLocationSearch from '../nominatim-location-search';
import NumberField from '../number-field';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ParameterField({
  parameter,
  ...props
}: {
  parameter: Parameter;
  onChange: (value: string | number | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  const Field = {
    number: NumberParameterField,
    string: StringParameterField,
    select: SelectParameterField,
    language: LanguageParameterField,
    horoscope: HoroscopeParameterField,
  }[parameter.type || 'string'];

  return <Field {...({ parameter } as any)} {...props} />;
}

function StringParameterField({
  parameter,
  onChange,
  ...props
}: { parameter: StringParameter; onChange: (value: string) => void } & Omit<TextFieldProps, 'onChange'>) {
  return (
    <TextField
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      multiline={parameter.multiline}
      minRows={parameter.multiline ? 2 : undefined}
      inputProps={{ maxLength: parameter.maxLength }}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
}

function NumberParameterField({
  parameter,
  ...props
}: {
  parameter: NumberParameter;
  onChange: (value: number | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  return (
    <NumberField
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      min={parameter.min}
      max={parameter.max}
      {...props}
    />
  );
}

function SelectParameterField({
  parameter,
  onChange,
  ...props
}: {
  parameter: SelectParameter;
  onChange: (value: string | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  return (
    <TextField
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}>
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {(parameter.options ?? []).map((option) => (
        <MenuItem key={option.id} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

const languages = [
  { en: 'English', cn: '英语' },
  { en: 'Simplified Chinese', cn: '中文-简体' },
  { en: 'Traditional Chinese', cn: '中文-繁体' },
  { en: 'Spanish', cn: '西班牙语' },
  { en: 'French', cn: '法语' },
  { en: 'German', cn: '德语' },
  { en: 'Italian', cn: '意大利语' },
  { en: 'Portuguese', cn: '葡萄牙语' },
  { en: 'Japanese', cn: '日语' },
  { en: 'Korean', cn: '韩语' },
  { en: 'Russian', cn: '俄语' },
  { en: 'Polish', cn: '波兰语' },
  { en: 'Arabic', cn: '阿拉伯语' },
  { en: 'Dutch', cn: '荷兰语' },
  { en: 'Swedish', cn: '瑞典语' },
  { en: 'Finnish', cn: '芬兰语' },
  { en: 'Czech', cn: '捷克语' },
  { en: 'Danish', cn: '丹麦语' },
  { en: 'Greek', cn: '希腊语' },
  { en: 'Romanian', cn: '罗马尼亚语' },
  { en: 'Hungarian', cn: '匈牙利语' },
  { en: 'Bulgarian', cn: '保加利亚语' },
  { en: 'Slovak', cn: '斯洛伐克语' },
  { en: 'Norwegian', cn: '挪威语' },
  { en: 'Hebrew', cn: '希伯来语' },
  { en: 'Turkish', cn: '土耳其语' },
  { en: 'Thai', cn: '泰语' },
  { en: 'Indonesian', cn: '印尼语' },
  { en: 'Vietnamese', cn: '越南语' },
  { en: 'Hindi', cn: '印地语' },
];

function LanguageParameterField({
  parameter,
  onChange,
  ...props
}: {
  parameter: SelectParameter;
  onChange: (value: string | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  const { locale } = useLocaleContext();

  return (
    <TextField
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}>
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {languages.map((option) => (
        <MenuItem key={option.en} value={option.en}>
          {locale === 'zh' ? option.cn : option.en}
        </MenuItem>
      ))}
    </TextField>
  );
}

function HoroscopeParameterField({
  parameter,
  value,
  onChange,
  ...props
}: {
  parameter: HoroscopeParameter;
  value: HoroscopeParameter['value'];
  onChange: (value: HoroscopeParameter['value'] | undefined) => void;
} & Pick<TextFieldProps, 'label' | 'placeholder' | 'helperText' | 'error'>) {
  const [val, setVal] = useState(() => ({ ...value }));

  useEffect(() => {
    if (!equal(val, value)) setVal({ ...value });
  }, [value]);

  useEffect(() => {
    const { location, offset, time } = val;
    if (location && time) {
      onChange({ location, offset, time });
    } else if (value) {
      onChange(undefined);
    }
  }, [val]);

  const horoscope = useMemo(
    () =>
      val.location && val.time
        ? parameterToStringValue({
            ...parameter,
            value: { time: val.time, offset: val.offset, location: val.location },
          })
        : '',
    [val]
  );

  const setAutoTimezone = useCallback(
    ({
      time,
      location,
    }: Partial<{ time: dayjs.ConfigType; location: NonNullable<HoroscopeParameter['value']>['location'] | null }>) => {
      const d = dayjs(time);
      const tz = location && tzlookup(location.latitude, location.longitude);
      const offset = tz ? d.tz(tz).utcOffset() : null;
      if (!isNil(offset)) {
        setVal((v) => ({ ...v, offset }));
      }
    },
    []
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <DateStringPicker
          slotProps={{ textField: { size: 'small' } }}
          label="Date"
          sx={{ flex: 1, minWidth: 200 }}
          value={val.time ?? null}
          onChange={(time) => {
            setVal((v) => ({ ...v, time: time ?? undefined }));
            setAutoTimezone({ ...val, time });
          }}
        />

        <NominatimLocationSearch
          sx={{ flex: 1, minWidth: 200 }}
          value={val?.location ?? null}
          onChange={(_, location) => {
            setVal((v) => ({ ...v, location: location ?? undefined }));
            setAutoTimezone({ ...val, location });
          }}
          renderInput={(params) => <TextField {...params} label="Location" size="small" />}
        />

        <UTCOffsetPicker
          label="Timezone"
          sx={{ flex: 1, minWidth: 200 }}
          value={val.offset ?? null}
          onChange={(offset) => setVal((v) => ({ ...v, offset: offset ?? undefined }))}
          slotProps={{ textField: { size: 'small' } }}
        />

        <Box sx={{ width: '100%', mt: -0.5 }}>
          <FormHelperText error={props.error}>{props.helperText}</FormHelperText>
        </Box>

        <TextField
          label={props.label}
          fullWidth
          size="small"
          multiline
          InputProps={{ readOnly: true }}
          value={horoscope}
          disabled
        />
      </Box>
    </LocalizationProvider>
  );
}

function DateStringPicker({
  format = 'YYYY-MM-DD HH:mm:ss',
  value,
  onChange,
  ...props
}: { format?: string; value?: string | null; onChange?: (value: string | null) => void } & Omit<
  DateTimePickerProps<dayjs.Dayjs>,
  'value' | 'onChange'
>) {
  const [time, setTime] = useState(() => (value ? dayjs(value) : null));

  useEffect(() => {
    if (time?.format(format) !== value) setTime(dayjs(value));
  }, [value]);

  return (
    <DateTimePicker
      ampm={false}
      {...props}
      value={time}
      onChange={(time) => {
        setTime(time);
        onChange?.(time?.format(format) ?? null);
      }}
    />
  );
}

function UTCOffsetPicker({
  value,
  onChange,
  ...props
}: { value?: number | null; onChange?: (value: number | null) => void } & Omit<
  TimePickerProps<dayjs.Dayjs>,
  'value' | 'onChange'
>) {
  const minutesToTime = useCallback(
    (value?: number | null) => (typeof value === 'number' ? dayjs().startOf('year').minute(Math.abs(value)) : value),
    []
  );

  const timeToMinutes = useCallback(
    (time?: dayjs.Dayjs | null) => (time ? time.hour() * 60 + time.minute() : time),
    []
  );

  const [time, setTime] = useState(() => minutesToTime(value));

  useEffect(() => {
    if (timeToMinutes(time) !== value) {
      setTime(minutesToTime(value));
    }
  }, [value]);

  const factor = typeof value === 'number' && value < 0 ? -1 : 1;

  return (
    <TimePicker
      ampm={false}
      {...props}
      value={time}
      slots={{ actionBar: () => null }}
      onChange={(time) => {
        setTime(time);
        onChange?.(time ? (time.hour() * 60 + time.minute()) * factor : null);
      }}
      slotProps={{
        ...props.slotProps,
        textField: {
          ...props.slotProps?.textField,
          InputProps: {
            startAdornment: (
              <InputAdornment position="start">
                <Button
                  size="small"
                  color="inherit"
                  sx={{ minWidth: 0, p: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange?.(typeof value === 'number' ? -value : null);
                  }}>
                  <Box component="span" sx={{ lineHeight: 1 }}>
                    UTC
                  </Box>
                  {factor === -1 ? <Remove fontSize="small" /> : <Add fontSize="small" />}
                </Button>
              </InputAdornment>
            ),
          },
        },
      }}
    />
  );
}

export function parameterToStringValue(parameter: Parameter): string {
  switch (parameter.type) {
    case undefined:
    case 'string':
    case 'number':
    case 'language':
    case 'select':
      return parameter.value?.toString() ?? '';
    case 'horoscope': {
      const { time, offset, location } = parameter.value ?? {};
      if (!time || !location) {
        return '';
      }
      let d = dayjs(time);
      if (!d.isValid()) {
        return '';
      }

      if (typeof offset === 'number') {
        d = d.utcOffset(offset, true);
      }
      d = d.tz(tzlookup(location.latitude, location.longitude), true);

      const horoscope = new Horoscope({
        origin: new Origin({
          year: d.year(),
          month: d.month(),
          date: d.date(),
          hour: d.hour(),
          minute: d.minute(),
          second: d.second(),
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const zh: Record<string, string> = {
        sun: '太阳',
        moon: '月亮',
        mercury: '水星',
        venus: '金星',
        mars: '火星',
        jupiter: '木星',
        saturn: '土星',
        uranus: '天王星',
        neptune: '海王星',
        pluto: '冥王星',
        chiron: '凯龙星',
        sirius: '天狼星',
        aries: '白羊座',
        taurus: '金牛座',
        gemini: '双子座',
        cancer: '巨蟹座',
        leo: '狮子座',
        virgo: '处女座',
        libra: '天秤座',
        scorpio: '天蝎座',
        sagittarius: '射手座',
        capricorn: '摩羯座',
        aquarius: '水瓶座',
        pisces: '双鱼座',
        ophiuchus: '蛇夫座',
      };

      return horoscope.CelestialBodies.all
        .map((i: any) => `${zh[i.key]}${zh[i.Sign.key]}`)
        .concat(horoscope.Houses.map((i: any, index: number) => `${index + 1}宫${zh[i.Sign.key]}`))
        .join('，');
    }
    default:
      throw new Error(`Unsupported parameter to string value ${parameter}`);
  }
}
