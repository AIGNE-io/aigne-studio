import { useCurrentProject } from '@app/contexts/project';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { ClickAwayListener } from '@mui/base';
import { Box, Divider, Popper, Stack, styled } from '@mui/material';
import { useEffect, useState } from 'react';
import { ChromePicker } from 'react-color';

import { useProjectStore } from '../yjs-state';

const defaultColors = ['', '#F47373', '#697689', '#37D67A', '#2CCCE4', '#555555', '#dce775', '#ff8a65', '#ba68c8'];

export default function ColorSetting({ type }: { type: 'primaryColor' | 'secondaryColor' }) {
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const setProjectSetting = (update: (v: typeof projectSetting) => void) => {
    const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
    doc.transact(() => {
      update(projectSetting);
    });
  };

  const [selectedColor, setSelectedColor] = useState(projectSetting?.appearance?.[type] || defaultColors[0]);
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
      config.appearance[type] = selectedColor;
    });
  }, [selectedColor]);

  return (
    <Stack
      data-testid="primary-color"
      sx={{
        gap: 2,
      }}>
      <Stack
        direction="row"
        sx={{
          gap: 1,
          alignItems: 'center',
        }}>
        {defaultColors?.map((color) => (
          <Box
            key={color}
            sx={{
              border: color === selectedColor ? '1px solid' : '',
              borderColor: 'divider',
              borderRadius: '4px',
            }}>
            <ColorBox bgcolor={color || 'background.default'} onClick={() => handleClick(color)} />
          </Box>
        ))}

        <Divider orientation="vertical" flexItem sx={{ mx: '2px' }} />
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Box sx={{ position: 'cursor' }}>
            <Box onClick={handleOpen}>
              <ChromePickerBox bgcolor={selectedColor} data-testid="chrome-picker-box" />
            </Box>
            <Popper open={open} anchorEl={anchorEl} sx={{ zIndex: 10000 }} placement="bottom-end">
              <Box
                sx={{
                  mt: 2,
                }}>
                <ChromePicker onChangeComplete={handleChangeComplete} color={selectedColor} disableAlpha />
              </Box>
            </Popper>
          </Box>
        </ClickAwayListener>
      </Stack>
    </Stack>
  );
}

const ColorBox = styled(Box)(({ theme }) => ({
  boxSizing: 'border-box',
  width: 20,
  height: 20,
  borderRadius: 4,
  margin: 2,
  border: '1px solid',
  borderColor: theme.palette.divider,
}));

const ChromePickerBox = styled(Box)(({ theme }) => ({
  boxSizing: 'border-box',
  width: 24,
  height: 24,
  borderRadius: 4,
  margin: 2,
  border: '1px solid',
  borderColor: theme.palette.divider,
}));
