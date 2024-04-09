import { Paper, SxProps, ToggleButton, ToggleButtonGroup } from '@mui/material';

interface Option {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface Props {
  value: string;
  options: Option[];
  onChange?: (value: string) => void;
  sx?: SxProps;
}

export default function SegmentedControl({ value, options, onChange, sx, ...rest }: Props) {
  const mergedSx = {
    display: 'inline-flex',
    borderRadius: '100vh',
    bgcolor: 'grey.100',
  };

  return (
    <Paper elevation={0} sx={mergedSx} {...rest}>
      <ToggleButtonGroup
        size="small"
        value={value}
        exclusive
        onChange={(_, v) => onChange?.(v)}
        sx={{
          '.MuiToggleButtonGroup-grouped': {
            m: 0.5,
            border: 0,
            borderRadius: '100vh',
            lineHeight: 1.3,
            textTransform: 'none',
            p: '6px 12px',
          },
          '.MuiToggleButtonGroup-grouped.Mui-selected': {
            bgcolor: '#fff',
            border: 1,
            borderColor: 'divider',
            ':hover': {
              bgcolor: 'grey.50',
            },
          },
          '.MuiToggleButtonGroup-middleButton, .MuiToggleButtonGroup-lastButton': {
            marginLeft: '-1px',
            borderLeft: '1px solid transparent',
          },
        }}>
        {options.map((x) => {
          return (
            <ToggleButton key={x.value} value={x.value}>
              {x.icon ?? null}
              {x.label}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Paper>
  );
}
