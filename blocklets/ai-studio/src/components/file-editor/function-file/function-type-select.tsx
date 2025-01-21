import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import brandNodejsIcon from '@iconify-icons/tabler/brand-nodejs';
import type { TextFieldProps } from '@mui/material';
import { ListItemIcon, MenuItem, TextField } from '@mui/material';

export const FunctionTypes = [
  { type: 'javascript', icon: <Icon icon={brandNodejsIcon} />, i18nKey: 'javascript' },
] as const;

export default function FunctionTypeSelect({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField
      select
      variant="standard"
      {...props}
      SelectProps={{
        MenuProps: {
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
          transformOrigin: { horizontal: 'right', vertical: 'top' },
        },
      }}>
      {FunctionTypes.map((i) => (
        <MenuItem key={i.type} value={i.type}>
          <ListItemIcon>{i.icon}</ListItemIcon>

          {t(i.i18nKey)}
        </MenuItem>
      ))}
    </TextField>
  );
}
