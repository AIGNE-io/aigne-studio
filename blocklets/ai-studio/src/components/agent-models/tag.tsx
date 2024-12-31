import { Chip, ChipProps, Stack } from '@mui/material';

export function Tag({ label, selected, ...rest }: { selected: boolean } & ChipProps) {
  const selectedStyle = {
    color: 'primary.dark',
    bgcolor: 'action.selected',
    borderColor: '#c0dafd',
  };
  return (
    <Chip
      label={label}
      sx={{
        height: 22,
        border: 1,
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'grey.100',
        '.MuiChip-label': {
          px: 1,
        },
        fontWeight: 'medium',
        ...(selected && selectedStyle),
        '&:hover': selectedStyle,
      }}
      {...rest}
    />
  );
}

interface TagFilterProps {
  value: string | null;
  onChange: (value: string) => void;
  prepend?: React.ReactNode;
  tags: string[];
}

export function TagFilter({ value, onChange, prepend, tags }: TagFilterProps) {
  const handleTagClick = (tag: string) => {
    onChange(tag);
  };
  return (
    <Stack direction="row" useFlexGap spacing={1} flexWrap="wrap">
      {prepend}
      {tags.map((tag) => (
        <Tag key={tag} label={tag} selected={value === tag} onClick={() => handleTagClick(tag)} />
      ))}
    </Stack>
  );
}
