import { ArrowDropDownRounded } from '@mui/icons-material';
import {
  autocompleteClasses,
  createTheme,
  filledInputClasses,
  inputBaseClasses,
  inputClasses,
  inputLabelClasses,
  outlinedInputClasses,
  sliderClasses,
} from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily:
      'ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji',
    button: {
      textTransform: 'none',
    },
  },
  palette: {
    background: {
      paper: '#ffffff',
      default: '#f5f5f5',
    },
    action: {
      selected: 'rgba(25, 118, 210, 0.08)',
    },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: 4,
        },
      },
    },
    MuiAutocomplete: {
      defaultProps: { popupIcon: <ArrowDropDownRounded /> },
      variants: [
        {
          props: {},
          style: ({ theme }) =>
            theme.unstable_sx({
              [`.${autocompleteClasses.inputRoot}`]: {
                pt: 1.5,
                pb: 0.25,

                [`.${autocompleteClasses.input}.${inputBaseClasses.input}`]: {
                  px: 0,
                  pt: 0.5,
                  pb: 0.25,
                },

                [`&.${inputBaseClasses.sizeSmall}`]: {
                  [`.${autocompleteClasses.input}.${inputBaseClasses.input}`]: {
                    px: 0,
                    py: 0,
                    pb: '1px',
                  },
                },
              },
            }),
        },
      ],
    },
    MuiTextField: {
      defaultProps: { variant: 'filled' },
      variants: [
        {
          props: {},
          style: ({ theme }) =>
            theme.unstable_sx({
              [`.${inputBaseClasses.root}`]: {
                borderRadius: 1,
                lineHeight: '1.5rem',

                [`.${inputBaseClasses.input}`]: {
                  height: '1.5rem',
                },

                [`&.${inputClasses.multiline}`]: {
                  py: 0,
                  px: 0,
                },
              },
              // standard
              [`.${inputClasses.root}`]: {
                mt: 1.5,
                [`&.${inputBaseClasses.hiddenLabel}`]: {
                  mt: 0,
                },
              },
              [`.${inputLabelClasses.standard}`]: {
                transform: 'translate(0px, 18px) scale(1)',
                [`&.${inputLabelClasses.sizeSmall}`]: {
                  transform: 'translate(0px, 15px) scale(1)',
                },
                [`&.${inputLabelClasses.shrink}`]: {
                  transform: 'translate(0px, -1px) scale(0.7)',
                  [`&.${inputLabelClasses.sizeSmall}`]: {
                    transform: 'translate(0px, -1px) scale(0.7)',
                  },
                },
              },
              // filled
              [`.${filledInputClasses.root}`]: {
                ':before,:after': { display: 'none' },

                [`.${inputBaseClasses.input}`]: {
                  pb: 0.5,
                  pt: 2,
                  px: 1,

                  ':focus': {
                    borderRadius: 1,
                  },

                  [`&.${inputBaseClasses.inputSizeSmall}`]: {
                    pt: 1.5,
                    pb: 0.25,
                  },

                  [`&.${inputBaseClasses.inputHiddenLabel}`]: {
                    py: 0.5,

                    [`&.${inputBaseClasses.inputSizeSmall}`]: {
                      py: '1px',
                    },
                  },
                },
              },
              [`.${inputLabelClasses.filled}`]: {
                transform: 'translate(8px, 11px) scale(1)',
                [`&.${inputLabelClasses.sizeSmall}`]: {
                  transform: 'translate(8px, 7px) scale(1)',
                },
                [`&.${inputLabelClasses.shrink}`]: {
                  transform: 'translate(8px, 2px) scale(0.7)',
                  [`&.${inputLabelClasses.sizeSmall}`]: {
                    transform: 'translate(8px, 0) scale(0.65)',
                  },
                },
              },
              // outlined
              [`.${outlinedInputClasses.root}`]: {
                [`.${inputBaseClasses.input}`]: {
                  py: 1.25,
                  px: 1,

                  [`&.${inputBaseClasses.inputSizeSmall}`]: {
                    py: 0.875,
                  },

                  [`&.${inputBaseClasses.inputHiddenLabel}`]: {
                    py: 0.5,

                    [`&.${inputBaseClasses.inputSizeSmall}`]: {
                      py: '1px',
                    },
                  },
                },
              },
              [`.${inputLabelClasses.outlined}`]: {
                transform: 'translate(8px, 10px) scale(1)',
                [`&.${inputLabelClasses.sizeSmall}`]: {
                  transform: 'translate(8px, 7px) scale(1)',
                },
                [`&.${inputLabelClasses.shrink}`]: {
                  transform: 'translate(16px, -7px) scale(0.7)',
                },
              },
            }),
        },
      ],
    },
    MuiInput: {
      defaultProps: { disableUnderline: true },
      variants: [
        {
          props: { disableUnderline: true },
          style: ({ theme }) =>
            theme.unstable_sx({
              lineHeight: '1.5rem',
              [`&.${inputBaseClasses.multiline}`]: {
                py: 0,
              },
              [`.${inputBaseClasses.input}`]: {
                py: 0.5,
                height: '1.5rem',
              },
              [`&.${inputBaseClasses.sizeSmall}`]: {
                [`.${inputBaseClasses.input}`]: {
                  py: '1px',
                },
              },
            }),
        },
      ],
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          '&:hover': {
            backgroundColor: 'rgb(0, 0, 0, 0.06)',
            '@media (hover: none)': {
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: { variant: 'filled', IconComponent: ArrowDropDownRounded },
      variants: [
        {
          props: {},
          style: ({ theme }) =>
            theme.unstable_sx({
              borderRadius: 1,
              lineHeight: '1.5rem',
              // filled
              [`&.${filledInputClasses.root}`]: {
                ':before,:after': { display: 'none' },

                [`.${inputBaseClasses.input}`]: {
                  py: 0.5,
                  borderRadius: 1,

                  [`&.${inputBaseClasses.inputSizeSmall}`]: {
                    py: '1px',
                  },
                },
              },
              // outlined
              [`&.${outlinedInputClasses.root}`]: {
                [`.${inputBaseClasses.input}`]: {
                  py: 0.5,
                  borderRadius: 1,

                  [`&.${inputBaseClasses.inputSizeSmall}`]: {
                    py: '1px',
                  },
                },
              },
            }),
        },
      ],
    },
    MuiSlider: {
      defaultProps: {},
      variants: [
        {
          props: {},
          style: ({ theme }) =>
            theme.unstable_sx({
              height: 3,
              [`.${sliderClasses.track}`]: {
                borderWidth: 0,
              },

              [`.${sliderClasses.thumb}`]: {
                width: 16,
                height: 16,
              },

              [`&.${sliderClasses.sizeSmall}`]: {
                height: 2,

                [`.${sliderClasses.thumb}`]: {
                  width: 12,
                  height: 12,
                },
              },
            }),
        },
      ],
    },
  },
});
