import { Chip, ChipProps, Stack } from '@mui/material';

import { useBrandTags } from './use-models';

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
  value: string[];
  onChange: (value: string[]) => void;
  prepend?: React.ReactNode;
}

export function TagFilter({ value, onChange, prepend }: TagFilterProps) {
  const brandTags = useBrandTags();
  const handleTagClick = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  };
  return (
    <Stack direction="row" spacing={1}>
      {prepend}
      {brandTags.map((tag) => (
        <Tag key={tag} label={tag} selected={value.includes(tag)} onClick={() => handleTagClick(tag)} />
      ))}
    </Stack>
  );
}
