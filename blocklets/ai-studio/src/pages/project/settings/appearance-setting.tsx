import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ClickAwayListener } from '@mui/base';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Box, Divider, Popper, Stack, Typography, styled } from '@mui/material';
import { useEffect, useState } from 'react';
import { ChromePicker } from 'react-color';

const defaultColors: string[] = [
  '#ffffff',
  '#F47373',
  '#697689',
  '#37D67A',
  '#2CCCE4',
  '#555555',
  '#dce775',
  '#ff8a65',
  '#ba68c8',
];

export default function AppearanceSetting({
  value,
  onSubmit,
  set,
  readOnly,
  submitLoading,
}: {
  value: string | undefined;
  onSubmit: () => void;
  set: (key: string, value: any) => void;
  readOnly: boolean;
  submitLoading: boolean;
}) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(value || defaultColors[0]);
  const { t } = useLocaleContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen((prev) => !prev);
  };
  const handleChangeComplete = (color: { hex: string }) => {
    setSelectedColor(color.hex);
  };

  const handleClick = (color: string) => {
    setSelectedColor(color);
  };

  useEffect(() => {
    set('primaryColor', selectedColor);
  }, [selectedColor]);

  return (
    <Box>
      <Typography variant="subtitle2" mb={0.5}>
        {t('primaryColor')}
      </Typography>
      <Stack gap={2}>
        <Stack direction="row" gap={1} alignItems="center">
          {defaultColors?.map((color) => (
            <Box key={color} border={color === selectedColor ? '1px solid #030712' : ''} borderRadius="4px">
              <ColorBox bgcolor={color} onClick={() => handleClick(color)} />
            </Box>
          ))}

          <Divider orientation="vertical" flexItem sx={{ mx: '2px' }} />
          <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box>
              <Box onClick={handleOpen}>
                <ChromePickerBox bgcolor={selectedColor} />
              </Box>
              <Popper open={open} anchorEl={anchorEl} sx={{ zIndex: 10000 }} placement="bottom-end">
                <Box mt={2}>
                  <ChromePicker onChangeComplete={handleChangeComplete} color={selectedColor} disableAlpha />
                </Box>
              </Popper>
            </Box>
          </ClickAwayListener>
        </Stack>
        <Box>
          <LoadingButton
            disabled={readOnly}
            loading={submitLoading}
            variant="contained"
            loadingPosition="start"
            startIcon={<SaveRounded />}
            onClick={onSubmit}>
            {t('save')}
          </LoadingButton>
        </Box>
      </Stack>
    </Box>
  );
}

const ColorBox = styled(Box)({
  boxSizing: 'border-box',
  width: 20,
  height: 20,
  borderRadius: 4,
  margin: 2,
  border: '1px solid #d6d6d6',
});

const ChromePickerBox = styled(Box)({
  boxSizing: 'border-box',
  width: 24,
  height: 24,
  borderRadius: 4,
  margin: 2,
  border: '1px solid #d6d6d6',
});
