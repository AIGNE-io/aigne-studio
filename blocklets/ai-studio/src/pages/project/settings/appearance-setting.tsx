import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Box, Dialog, DialogContent, Divider, Stack, Typography, dialogContentClasses, styled } from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
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
  const [selectedColor, setSelectedColor] = useState<string | undefined>(value);
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });

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
          <Box onClick={dialogState.open} sx={{ position: 'relative' }}>
            <ChromePickerBox bgcolor={selectedColor} />
          </Box>
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

      <Dialog
        {...bindDialog(dialogState)}
        hideBackdrop
        sx={{
          mt: '90px',
          [`.${dialogContentClasses.root}`]: {
            padding: '8px !important',
          },
        }}
        PaperProps={{
          elevation: 0,
          style: {
            position: 'absolute',
            top: '152px',
            right: '130px',
            margin: 0,
          },
        }}>
        <DialogContent>
          <Box mt={2}>
            <ChromePicker onChangeComplete={handleChangeComplete} color={selectedColor} disableAlpha />
          </Box>
        </DialogContent>
      </Dialog>
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
