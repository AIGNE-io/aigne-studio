import { Select } from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';

const BaseSelect = muiStyled(Select)(({ theme }) => ({
  outline: 'none',

  '& .MuiInputBase-input': {
    borderRadius: 6,
    padding: '4px 12px',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : '#1A2027',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? '#E5E7EB' : '#2D3843',
    transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
    fontSize: '14px',
    outline: 'none',

    '&:focus': {
      boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
      borderColor: theme.palette.primary.main,
      outline: 'none',
    },
  },

  '.MuiOutlinedInput-notchedOutline': {
    border: '1px solid !important',
    borderColor: theme.palette.mode === 'light' ? '#E5E7EB !important' : '#2D3843 !important',
    outline: 'none',
  },

  '&:hover .MuiOutlinedInput-notchedOutline': {
    border: '1px solid !important',
    borderColor: theme.palette.mode === 'light' ? '#E5E7EB !important' : '#2D3843 !important',
    outline: 'none',
  },
}));

export default BaseSelect;
