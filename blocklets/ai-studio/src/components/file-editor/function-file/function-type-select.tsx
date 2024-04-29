import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import { ListItemIcon, MenuItem, TextField, TextFieldProps } from '@mui/material';

export const FunctionTypes = [
  { type: 'javascript', icon: <Icon icon="tabler:brand-nodejs" />, i18nKey: 'javascript' },
] as const;

export default function FunctionTypeSelect({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField select variant="standard" {...props}>
      {FunctionTypes.map((i) => (
        <MenuItem key={i.type} value={i.type}>
          <ListItemIcon>{i.icon}</ListItemIcon>

          {t(i.i18nKey)}
        </MenuItem>
      ))}
    </TextField>
  );
}
