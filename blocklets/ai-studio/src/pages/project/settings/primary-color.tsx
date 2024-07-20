import { useCurrentProject } from '@app/contexts/project';
import { ClickAwayListener } from '@mui/base';
import { Box, Divider, Popper, Stack, styled } from '@mui/material';
import { useEffect, useState } from 'react';
import { ChromePicker } from 'react-color';

import { useProjectStore } from '../yjs-state';

const defaultColors = ['', '#F47373', '#697689', '#37D67A', '#2CCCE4', '#555555', '#dce775', '#ff8a65', '#ba68c8'];

export default function PrimaryColor() {
  const { projectId, projectRef } = useCurrentProject();
  const { setProjectSetting, projectSetting } = useProjectStore(projectId, projectRef);

  const [selectedColor, setSelectedColor] = useState(projectSetting?.appearance?.primaryColor || defaultColors[0]);
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
    setProjectSetting((config) => {
      config.appearance ??= {};
      config.appearance.primaryColor = selectedColor;
    });
  }, [selectedColor]);

  return (
    <Stack gap={2} data-testid="primary-color">
      <Stack direction="row" gap={1} alignItems="center">
        {defaultColors?.map((color) => (
          <Box key={color} border={color === selectedColor ? '1px solid #030712' : ''} borderRadius="4px">
            <ColorBox bgcolor={color || '#ffffff'} onClick={() => handleClick(color)} />
          </Box>
        ))}

        <Divider orientation="vertical" flexItem sx={{ mx: '2px' }} />
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Box sx={{ position: 'cursor' }}>
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
    </Stack>
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
