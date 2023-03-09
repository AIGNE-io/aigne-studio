import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { LocationSearchingOutlined } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  TextFieldProps,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Horoscope, Origin } from 'circular-natal-horoscope-js/dist';
import dayjs from 'dayjs';
import equal from 'fast-deep-equal';
import { useEffect, useMemo, useState } from 'react';
import MapPicker from 'react-google-map-picker';

import {
  HoroscopeParameter,
  NumberParameter,
  Parameter,
  SelectParameter,
  StringParameter,
} from '../../../api/src/store/templates';
import NumberField from './number-field';

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
  const [val, setVal] = useState<Partial<typeof value>>(value);

  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number }>();

  const [defaultLocation] = useState(() => ({ lng: 0, lat: 0 }));

  const [date, setDate] = useState<dayjs.Dayjs | null>(() => (value && dayjs(value.time)) || null);

  useEffect(() => {
    if (!equal(value, val)) {
      setVal({ time: value?.time, location: value?.location });
      setDate(value?.time ? dayjs(value.time) : null);
      setLocation(value?.location ? { lng: value.location.longitude, lat: value.location.latitude } : undefined);
    }
  }, [value]);

  useEffect(() => {
    setVal((v) => ({ ...v, time: date?.toISOString() }));
  }, [date]);

  useEffect(() => {
    const { location, time } = val ?? {};
    if (location && time) {
      onChange({ location, time });
    }
  }, [val]);

  const horoscope = useMemo(() => parameterToStringValue(parameter), [val]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex' }}>
        <FormControl sx={{ flex: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker label="Date" value={date} onChange={setDate} slotProps={{ textField: { size: 'small' } }} />
          </LocalizationProvider>
        </FormControl>
        <FormControl sx={{ flex: 1, ml: 1 }}>
          <TextField
            label="Location"
            size="small"
            value={val?.location ? `${val.location.latitude},${val.location.longitude}` : ''}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setOpen(true)}>
                    <LocationSearchingOutlined />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </FormControl>
      </Box>

      <TextField
        label={props.label}
        fullWidth
        size="small"
        multiline
        InputProps={{ readOnly: true }}
        value={horoscope}
        error={props.error}
        helperText={props.helperText}
        sx={{ mt: 1 }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Pick location</DialogTitle>
        <DialogContent>
          <Box>
            <Box component="span">Latitude: {location?.lat}</Box>
            <Box component="span" sx={{ ml: 1 }}>
              Longitude: {location?.lng}
            </Box>
          </Box>
          <Box
            component={MapPicker}
            sx={{ width: '100%', height: '100%' }}
            defaultLocation={location ?? defaultLocation}
            onChangeLocation={(lat, lng) => setLocation({ lat, lng })}
            apiKey="AIzaSyD07E1VvpsN_0FvsmKAj4nK9GnLq-9jtj8"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setOpen(false);
              setVal((v) => ({
                ...v,
                location:
                  (location && {
                    latitude: location.lat,
                    longitude: location.lng,
                  }) ||
                  undefined,
              }));
            }}>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function parameterToStringValue(parameter: Parameter) {
  switch (parameter.type) {
    case undefined:
    case 'string':
    case 'number':
    case 'language':
    case 'select':
      return parameter.value?.toString() ?? '';
    case 'horoscope': {
      const { time, location } = parameter.value ?? {};
      if (!time || !location) {
        return '';
      }
      const date = dayjs(time);
      const horoscope = new Horoscope({
        origin: new Origin({
          year: date.year(),
          month: date.month() + 1,
          date: date.date(),
          hour: date.hour(),
          minute: date.minute(),
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
        .map((i: any) => {
          return {
            house: zh[i.key],
            sign: zh[i.House?.Sign.key],
          };
        })
        .filter((i: any) => i.house && i.sign)
        .map((i: any) => `${i.house}${i.sign}`)
        .join('，');
    }
    default:
      throw new Error(`Unsupported parameter to string value ${parameter}`);
  }
}
