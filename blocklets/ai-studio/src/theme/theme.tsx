import { Icon } from '@iconify-icon/react';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import { loadingButtonClasses } from '@mui/lab';
import {
  Box,
  BoxProps,
  autocompleteClasses,
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
import { createTheme } from '@mui/material/styles';

export const lightThemeRoot = `
:root {
  /* Light */
  /* colors */
  --backgrounds-bg-base: #FFFFFF;
  --backgrounds-bg-base-hover: #F9FAFB;
  --backgrounds-bg-base-pressed: #F3F4F6;
  --backgrounds-bg-component: #F1F3F5;
  --backgrounds-bg-disabled: #F3F4F6;
  --backgrounds-bg-field: #F9FAFB;
  --backgrounds-bg-field-hover: #F3F4F6;
  --backgrounds-bg-glass: #ffffffb8;
  --backgrounds-bg-highlight: #EFF6FF;
  --backgrounds-bg-highlight-hover: #DBEAFE;
  --backgrounds-bg-interactive: #3B82F6;
  --backgrounds-bg-interactive-hover: #2563EB;
  --backgrounds-bg-overlay: #03071266;
  --backgrounds-bg-subtle: #F9FAFB;
  --backgrounds-bg-subtle-hover: #F3F4F6;
  --backgrounds-bg-subtle-pressed: #E5E7EB;
  --backgrounds-bg-switch-off: #E5E7EB;
  --backgrounds-bg-switch-off-hover: #D1D5DB;
  --buttons-button-danger: #E11D48;
  --buttons-button-danger-hover: #BE123C;
  --buttons-button-danger-pressed: #9F1239;
  --buttons-button-inverted: #030712;
  --buttons-button-inverted-hover: #111827;
  --buttons-button-inverted-pressed: #1F2937;
  --buttons-button-neutral: #FFFFFF;
  --buttons-button-neutral-hover: #F3F4F6;
  --buttons-button-neutral-pressed: #E5E7EB;
  --buttons-button-transparent: #ffffff00;
  --buttons-button-transparent-hover: #F3F4F6;
  --buttons-button-transparent-pressed: #E5E7EB;
  --foregrounds-fg-base: #030712;
  --foregrounds-fg-danger: #E11D48;
  --foregrounds-fg-disabled: #D1D5DB;
  --foregrounds-fg-interactive: #3B82F6;
  --foregrounds-fg-interactive-hover: #2563EB;
  --foregrounds-fg-muted: #9CA3AF;
  --foregrounds-fg-on-color: #FFFFFF;
  --foregrounds-fg-on-inverted: #FFFFFF;
  --foregrounds-fg-subtle: #4B5563;
  --others-spacer: #ffffff00;
  --shadows-card-hover-1: #03071214;
  --shadows-card-hover-2: #03071214;
  --shadows-card-hover-3: #0307121a;
  --shadows-card-rest-1: #03071214;
  --shadows-card-rest-2: #03071214;
  --shadows-card-rest-3: #0307120a;
  --shadows-danger-1: #E11D48;
  --shadows-error-2: #e11d4826;
  --shadows-flyout-1: #03071214;
  --shadows-flyout-2: #03071214;
  --shadows-interactive-with-active-1: #3B82F6;
  --shadows-interactive-with-active-2: #3b82f633;
  --shadows-interactive-with-shadow-1: #1e3a8a80;
  --shadows-interactive-with-shadow-2: #3B82F6;
  --shadows-modal-1: #FFFFFF;
  --shadows-modal-2: #e5e7eb66;
  --shadows-modal-3: #03071214;
  --shadows-modal-4: #03071214;
  --shadows-modal-5: #03071214;
  --shadows-switch-background-1: #0307120a;
  --shadows-switch-background-2: #0307120a;
  --shadows-switch-background-3: #0307120f;
  --shadows-switch-background-4: #03071205;
  --shadows-switch-background-5: #0307120a;
  --shadows-switch-handle-1: #FFFFFF;
  --shadows-switch-handle-2: #FFFFFF;
  --shadows-switch-handle-3: #03071205;
  --shadows-switch-handle-4: #03071205;
  --shadows-switch-handle-5: #0307120a;
  --shadows-switch-handle-6: #0307121f;
  --shadows-switch-handle-7: #03071214;
  --shadows-tooltip-1: #03071214;
  --shadows-tooltip-2: #03071214;
  --stroke-border-base: #E5E7EB;
  --stroke-border-error: #E11D48;
  --stroke-border-interactive: #3B82F6;
  --stroke-border-loud: #030712;
  --stroke-border-strong: #D1D5DB;
  --stroke-sep: #E5E7EB;
  --tags-tag-blue-bg: #DBEAFE;
  --tags-tag-blue-bg-hover: #BFDBFE;
  --tags-tag-blue-border: #BFDBFE;
  --tags-tag-blue-icon: #2563EB;
  --tags-tag-blue-text: #1D4ED8;
  --tags-tag-green-bg: #D1FAE5;
  --tags-tag-green-bg-hover: #A7F3D0;
  --tags-tag-green-border: #A7F3D0;
  --tags-tag-green-icon: #059669;
  --tags-tag-green-text: #047857;
  --tags-tag-neutral-bg: #F3F4F6;
  --tags-tag-neutral-bg-hover: #E5E7EB;
  --tags-tag-neutral-border: #E5E7EB;
  --tags-tag-neutral-icon: #6B7280;
  --tags-tag-neutral-text: #4B5563;
  --tags-tag-orange-bg: #FEF4C7;
  --tags-tag-orange-bg-hover: #FDE68A;
  --tags-tag-orange-border: #FDE68A;
  --tags-tag-orange-icon: #D97706;
  --tags-tag-orange-text: #B45309;
  --tags-tag-purple-bg: #EDE9FE;
  --tags-tag-purple-bg-hover: #DDD6FE;
  --tags-tag-purple-border: #DDD6FE;
  --tags-tag-purple-icon: #7C3AED;
  --tags-tag-purple-text: #6D28D9;
  --tags-tag-red-bg: #FFE4E6;
  --tags-tag-red-bg-hover: #FECDD3;
  --tags-tag-red-border: #FECDD3;
  --tags-tag-red-icon: #E11D48;
  --tags-tag-red-text: #BE123C;
  /* numbers */
  --others-max-width-root: 1200px;
  --radius-s: 4px;
  --radius-m: 8px;
  --radius-l: 12px;
  --radius-round: 9999px;
}`;

export const darkThemeRoot = `
:root {
  /* Dark */
  /* colors */
  --backgrounds-bg-base: #1B1B1F;
  --backgrounds-bg-base-hover: #27282D;
  --backgrounds-bg-base-pressed: #2E3035;
  --backgrounds-bg-component: #27282D;
  --backgrounds-bg-disabled: #27282D;
  --backgrounds-bg-field: #27282D;
  --backgrounds-bg-field-hover: #2E3035;
  --backgrounds-bg-glass: #1b1b1fb8;
  --backgrounds-bg-highlight: #172554;
  --backgrounds-bg-highlight-hover: #1E3A8A;
  --backgrounds-bg-interactive: #60A5FA;
  --backgrounds-bg-interactive-hover: #60A5FA;
  --backgrounds-bg-overlay: #18181ab2;
  --backgrounds-bg-subtle: #18181A;
  --backgrounds-bg-subtle-hover: #1B1B1F;
  --backgrounds-bg-subtle-pressed: #27282D;
  --backgrounds-bg-switch-off: #35373C;
  --backgrounds-bg-switch-off-hover: #464B50;
  --buttons-button-danger: #9F1239;
  --buttons-button-danger-hover: #BE123C;
  --buttons-button-danger-pressed: #E11D48;
  --buttons-button-inverted: #EDEEF0;
  --buttons-button-inverted-hover: #FFFFFF;
  --buttons-button-inverted-pressed: #EDEEF0;
  --buttons-button-neutral: #27282D;
  --buttons-button-neutral-hover: #35373C;
  --buttons-button-neutral-pressed: #3C3F44;
  --buttons-button-transparent: #ffffff00;
  --buttons-button-transparent-hover: #27282D;
  --buttons-button-transparent-pressed: #2E3035;
  --foregrounds-fg-base: #EDEEF0;
  --foregrounds-fg-danger: #FB7185;
  --foregrounds-fg-disabled: #3C3F44;
  --foregrounds-fg-interactive: #60A5FA;
  --foregrounds-fg-interactive-hover: #3B82F6;
  --foregrounds-fg-muted: #696E77;
  --foregrounds-fg-on-color: #FFFFFF;
  --foregrounds-fg-on-inverted: #0A0A0A;
  --foregrounds-fg-subtle: #ADB1B8;
  --others-spacer: #FFFFFF;
  --shadows-card-hover-1: #ffffff1a;
  --shadows-card-hover-2: #ffffff29;
  --shadows-card-hover-3: #00000066;
  --shadows-card-rest-1: #ffffff1a;
  --shadows-card-rest-2: #ffffff29;
  --shadows-card-rest-3: #00000066;
  --shadows-danger-1: #f43f5e1a;
  --shadows-error-2: #e11d4840;
  --shadows-flyout-1: #ffffff1a;
  --shadows-flyout-2: #00000052;
  --shadows-interactive-with-active-1: #60A5FA;
  --shadows-interactive-with-active-2: #3b82f640;
  --shadows-interactive-with-shadow-1: #dbeafe80;
  --shadows-interactive-with-shadow-2: #60A5FA;
  --shadows-modal-1: #171717;
  --shadows-modal-2: #2e303566;
  --shadows-modal-3: #ffffff1a;
  --shadows-modal-4: #00000052;
  --shadows-modal-5: #00000052;
  --shadows-switch-background-1: #0000001a;
  --shadows-switch-background-2: #0000001a;
  --shadows-switch-background-3: #ffffff29;
  --shadows-switch-background-4: #0000001a;
  --shadows-switch-background-5: #00000033;
  --shadows-switch-handle-1: #FFFFFF;
  --shadows-switch-handle-2: #FFFFFF;
  --shadows-switch-handle-3: #00000029;
  --shadows-switch-handle-4: #0000001a;
  --shadows-switch-handle-5: #0000001a;
  --shadows-switch-handle-6: #0000001a;
  --shadows-switch-handle-7: #0000001a;
  --shadows-tooltip-1: #ffffff1a;
  --shadows-tooltip-2: #00000052;
  --stroke-border-base: #2E3035;
  --stroke-border-error: #F43F5E;
  --stroke-border-interactive: #60A5FA;
  --stroke-border-loud: #EDEEF0;
  --stroke-border-strong: #35373C;
  --stroke-sep: #2E3035;
  --tags-tag-blue-bg: #172554;
  --tags-tag-blue-bg-hover: #1E2A8A;
  --tags-tag-blue-border: #1E3A8A;
  --tags-tag-blue-icon: #1D4ED8;
  --tags-tag-blue-text: #3B82F6;
  --tags-tag-green-bg: #022C22;
  --tags-tag-green-bg-hover: #064E3B;
  --tags-tag-green-border: #064E3B;
  --tags-tag-green-icon: #047857;
  --tags-tag-green-text: #10B981;
  --tags-tag-neutral-bg: #2E3035;
  --tags-tag-neutral-bg-hover: #35373C;
  --tags-tag-neutral-border: #3C3F44;
  --tags-tag-neutral-icon: #7D828A;
  --tags-tag-neutral-text: #ADB1B8;
  --tags-tag-orange-bg: #451A03;
  --tags-tag-orange-bg-hover: #78350F;
  --tags-tag-orange-border: #78350F;
  --tags-tag-orange-icon: #B45309;
  --tags-tag-orange-text: #F59E0B;
  --tags-tag-purple-bg: #2E1064;
  --tags-tag-purple-bg-hover: #4C1D95;
  --tags-tag-purple-border: #3C3F44;
  --tags-tag-purple-icon: #6D28D9;
  --tags-tag-purple-text: #8B5CF6;
  --tags-tag-red-bg: #4C0519;
  --tags-tag-red-bg-hover: #881337;
  --tags-tag-red-border: #881337;
  --tags-tag-red-icon: #F43F5E;
  --tags-tag-red-text: #FF6369;
  /* numbers */
  --others-max-width-root: 1200px;
  --radius-s: 4px;
  --radius-m: 8px;
  --radius-l: 12px;
  --radius-round: 9999px;
}`;

export const theme = createTheme({
  typography: {
    fontFamily:
      'ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji',
    button: {
      textTransform: 'none',
    },
    subtitle1: {
      fontWeight: 600,
      fontSize: 18,
      color: '#000',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '14px',
      lineHeight: '24px',
      fontWeight: 500,
      color: '#030712',
      marginBottom: '4px',
    },
    subtitle3: {
      fontSize: '13px',
      lineHeight: '22px',
      fontWeight: 400,
      color: '#4B5563',
    },
    subtitle4: {
      fontSize: '13px',
      lineHeight: '22px',
      fontWeight: 500,
      color: '#030712',
    },
    subtitle5: {
      fontSize: '12px',
      lineHeight: '20px',
      fontWeight: 400,
      color: '#9CA3AF',
    },
  },
  palette: {
    background: {
      paper: '#ffffff',
      default: '#F9FAFB',
    },
    action: {
      selected: 'rgba(25, 118, 210, 0.08)',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: lightThemeRoot,
    },
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
                ':before,:after': { display: 'none' },

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
        root: {
          fontSize: '0.875rem',
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
        root: {
          padding: '16px 24px',
          borderBottom: '1px solid #E5E7EB',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          borderTop: '1px solid #E5E7EB',
          padding: '16px 24px',
        },
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
        contained: {
          backgroundColor: '#030712',
          color: 'white',

          '&:hover': {
            backgroundColor: '#030712',
          },

          [`&.${loadingButtonClasses.loading}`]: {
            color: 'grey',
          },
        },
        outlined: {
          bgcolor: '#fff',
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

function SelectIcon(props: BoxProps) {
  return <Box {...props} component={Icon} icon={ChevronDownIcon} />;
}
