import { ThemeOptions, buttonClasses } from '@mui/material';

export const agentViewTheme: ThemeOptions = {
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          lineHeight: 1.5,
        },
        contained: ({ theme }) => ({
          backgroundColor: theme.palette.text.primary,
          color: 'white',

          '&:hover': {
            backgroundColor: theme.palette.text.primary,
          },

          [`&.${buttonClasses.loading}`]: {
            color: theme.palette.grey[500],
          },
        }),
        outlined: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          fontSize: '13px',
          fontWeight: 500,
          padding: '5px 12px',

          '&:hover': {
            border: `1px solid ${theme.palette.divider}`,
          },
        }),
      },
    },
  },
};
