import { Badge, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';

interface Option {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

interface Props {
  value: string;
  options: Option[];
  onChange?: (value: any) => void;
}

export default function SegmentedControl({ value, options, onChange = undefined, ...rest }: Props) {
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
            <ToggleButton key={x.value} data-testid={`project-page-${x.value}`} value={x.value}>
              {x.icon ?? null}
              {x.label}
              {x.count ? (
                <Badge
                  badgeContent={x.count}
                  sx={{
                    '.MuiBadge-badge': {
                      position: 'relative',
                      transformOrigin: '0 0',
                      transform: 'matrix(1,0,0,1,0,0)',
                    },
                  }}
                />
              ) : null}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </Paper>
  );
}
