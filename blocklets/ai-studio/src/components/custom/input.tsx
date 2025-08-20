import { InputBase } from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';

const BaseInput = muiStyled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 6,
    padding: '4px 12px',
    backgroundColor: theme.palette.background.default,
    border: '1px solid',
    borderColor: theme.palette.grey[200],
    transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
    fontSize: '14px',

    '&:focus': {
      boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
      borderColor: theme.palette.primary.main,
    },
  },
}));

export default BaseInput;
