import { buttonClasses, createTheme } from '@mui/material';

export const agentViewTheme = createTheme({
  typography: { button: { textTransform: 'none' } } as any,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          lineHeight: 1.5,
        },

        contained: {
          backgroundColor: '#030712',
          color: 'white',

          '&:hover': {
            backgroundColor: '#030712',
          },

          [`&.${buttonClasses.loading}`]: {
            color: 'grey',
          },
        },
        outlined: {
          backgroundColor: '#fff',
          color: '#000',
          border: '1px solid #E5E7EB',
          fontSize: '13px',
          fontWeight: 500,
          padding: '5px 12px',

          '&:hover': {
            border: '1px solid #E5E7EB',
          },
        },
      },
    },
  },
});
