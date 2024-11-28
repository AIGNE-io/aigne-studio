import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment, TextField, Theme, useMediaQuery } from '@mui/material';

import { useSelectAgentContext } from '../select-agent-context';

export default function SelectAgentSearch() {
  const { keyword, setKeyword } = useSelectAgentContext();
  const downSm = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const { t } = useLocaleContext();

  return (
    <TextField
      sx={{ width: downSm ? 180 : 300 }}
      hiddenLabel
      placeholder={t('alert.search')}
      InputProps={{
        sx: {
          '&&& .MuiInputBase-input': {
            height: '24px',
            padding: '8px 12px 8px 0',
          },
        },
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 20 }} />
          </InputAdornment>
        ),
      }}
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
  );
}
