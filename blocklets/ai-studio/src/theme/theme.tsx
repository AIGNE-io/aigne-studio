import { Icon } from '@iconify-icon/react';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import {
  Box,
  BoxProps,
  ThemeOptions,
  autocompleteClasses,
  buttonClasses,
  filledInputClasses,
  inputBaseClasses,
  inputClasses,
  inputLabelClasses,
  listItemIconClasses,
  outlinedInputClasses,
  selectClasses,
  sliderClasses,
  svgIconClasses,
  switchClasses,
} from '@mui/material';

function SelectIcon(props: BoxProps) {
  return <Box {...props} component={Icon} icon={ChevronDownIcon} />;
}

export const theme: ThemeOptions = {
  typography: (palette) => ({
    button: {
      textTransform: 'none',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: 18,
      color: palette.grey.A700,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '14px',
      lineHeight: '24px',
      fontWeight: 500,
      color: palette.text.primary,
      marginBottom: '4px',
    },
    subtitle3: {
      fontSize: '13px',
      lineHeight: '22px',
      fontWeight: 400,
      color: palette.text.secondary,
    },
    subtitle4: {
      fontSize: '13px',
      lineHeight: '22px',
      fontWeight: 500,
      color: palette.text.primary,
    },
    subtitle5: {
      fontSize: '12px',
      lineHeight: '20px',
      fontWeight: 400,
      color: palette.grey[400],
    },
  }),
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
        root: {
          marginLeft: 0,
        },
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

          [`.${svgIconClasses.fontSizeMedium}`]: {
            fontSize: '1.25rem',
          },

          [`.${svgIconClasses.fontSizeSmall}`]: {
            fontSize: '1.125rem',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 4,

          [`.${svgIconClasses.fontSizeMedium}`]: {
            fontSize: '1.25rem',
          },

          [`.${svgIconClasses.fontSizeSmall}`]: {
            fontSize: '1.125rem',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          height: 28,
          width: 48,
          padding: 8,

          [`&.${switchClasses.sizeSmall}`]: {
            height: 26,
            width: 40,
            padding: 8,
          },
        },
        switchBase: {
          padding: 4,
        },
      },
    },
    MuiAutocomplete: {
      defaultProps: { popupIcon: <SelectIcon fontSize={14} /> },
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
          // @ts-ignore
          style: ({ theme, ownerState }) =>
            theme.unstable_sx({
              [`.${inputBaseClasses.root}`]: {
                borderRadius: 1,
                lineHeight: '1.5rem',

                [`.${inputBaseClasses.input}`]: {
                  height: '1.5rem',
                },

                [`&.${inputClasses.multiline}`]: {
                  pl: 0,
                  pr: 0,
                  '&.MuiInputBase-adornedEnd': {
                    pr: 1.5,
                  },
                  '& .MuiInputBase-inputMultiline': {
                    py: 0,
                  },
                },
              },
              // standard
              [`.${inputClasses.root}`]: {
                mt: 1.5,
                [`&.${inputBaseClasses.hiddenLabel}`]: {
                  mt: 0,
                  pt: 0,

                  [`.${selectClasses.select}.${inputClasses.input}:focus`]: {
                    bgcolor: 'transparent',
                  },
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
                '&::before, &::after': {
                  display: 'none',
                },
                [`.${inputBaseClasses.input}`]: {
                  pb: 0.5,
                  pt: ownerState?.label ? 2 : 0.5,
                  px: 1,

                  ':focus': {
                    borderRadius: 1,
                  },

                  [`&.${inputBaseClasses.inputSizeSmall}`]: {
                    pb: 0.25,
                    pt: ownerState?.label ? 1.25 : 0.25,
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
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
        body: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiInput: {
      defaultProps: { disableUnderline: true },
      variants: [
        {
          props: { disableUnderline: true },
          style: ({ theme }) =>
            theme.unstable_sx({
              fontSize: '0.875rem',
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
        root: ({ theme }) => ({
          fontSize: '0.875rem',
          backgroundColor: theme.palette.grey[100],
          '&:hover': {
            backgroundColor: theme.palette.grey[200],
            '@media (hover: none)': {
              backgroundColor: theme.palette.grey[100],
            },
          },
        }),
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          display: 'flex',
          alignItems: 'center',

          [`.${listItemIconClasses.root}`]: {
            minWidth: 20,
          },
        },
      },
      defaultProps: { variant: 'filled', IconComponent: SelectIcon },
      variants: [
        {
          props: {},
          style: ({ theme }) =>
            theme.unstable_sx({
              fontSize: '0.875rem',
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
    MuiFormHelperText: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.unstable_sx({
            mx: 1,
          }),
      },
    },
    MuiTypography: {
      variants: [
        {
          props: { variant: 'body1' },
          style: ({ theme }) =>
            theme.unstable_sx({
              fontSize: '0.875rem',
            }),
        },
        {
          props: { variant: 'body2' },
          style: ({ theme }) =>
            theme.unstable_sx({
              fontSize: '0.75rem',
            }),
        },
      ],
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.unstable_sx({
            padding: '6px 12px',
            fontSize: '0.875rem',
            borderRadius: 1,

            '.MuiListItemIcon-root': {
              minWidth: 0,
              mr: 1,
            },
          }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '6px 12px',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          padding: 4,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: '16px 24px',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderTop: `1px solid ${theme.palette.divider}`,
          padding: '16px 24px',
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 24px !important',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        contained: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,

          '&:hover': {
            backgroundColor: theme.palette.primary.main,
          },

          [`&.${buttonClasses.loading}`]: {
            color: theme.palette.text.disabled,
          },
        }),
        outlined: () => ({
          fontSize: '13px',
          fontWeight: 500,
          padding: '5px 12px',
        }),
      },
    },
  },
};
