import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { ExpandMoreRounded, InfoOutlined } from '@mui/icons-material';
import { Box, Button, Collapse, FormLabel, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { defaultImageModel, getSupportedImagesModels } from '../../../libs/common';
import WithAwareness from '../../awareness/with-awareness';
import ModelSelectField from '../../selector/model-select-field';
import SliderNumberField from '../../slider-number-field';

export default function ImageAssistantSetting({
  projectId,
  gitRef,
  value,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  value: ImageAssistantYjs;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();

  const [open, setOpen] = useState(false);

  const { value: supportedModels } = useAsync(() => getSupportedImagesModels(), []);

  const model = value.model || defaultImageModel;

  const modelDetail = useMemo(() => {
    return supportedModels?.find((i) => i.model === model);
  }, [model, supportedModels]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle1">{t('callPrompt')}</Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end">
          {!open && (
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography
                component="span"
                sx={{ bgcolor: 'rgba(241, 243, 245, 1)', p: 1, borderRadius: 1, lineHeight: 1 }}>
                {model}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Button sx={{ minWidth: 32, minHeight: 32 }} onClick={() => setOpen(!open)}>
          <ExpandMoreRounded
            sx={{
              transform: open ? 'rotateZ(180deg)' : undefined,
              transition: (theme) => theme.transitions.create('all'),
            }}
          />
        </Button>
      </Stack>

      <Collapse in={open}>
        <Stack py={1} gap={1}>
          <Box position="relative">
            <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
              <ModelSelectField
                fullWidth
                isImageModel
                label={t('model')}
                value={model}
                onChange={(e) => {
                  const doc = (getYjsValue(value) as Map<any>).doc!;
                  doc.transact(() => {
                    value.model = e.target.value;
                    if (Object.hasOwn(value, 'n')) delete value.n;
                    if (Object.hasOwn(value, 'quality')) delete value.quality;
                    if (Object.hasOwn(value, 'size')) delete value.size;
                    if (Object.hasOwn(value, 'style')) delete value.style;
                  });
                }}
                InputProps={{ readOnly }}
              />
            </WithAwareness>
          </Box>

          {modelDetail && (
            <Box
              sx={{
                display: 'table',
                '> div': {
                  display: 'table-row',

                  '> label, > div': {
                    whiteSpace: 'nowrap',
                    display: 'table-cell',
                    py: 0.5,
                    px: 1,
                    verticalAlign: 'middle',
                  },

                  '> div': {
                    width: '100%',
                  },
                },
              }}>
              {typeof modelDetail.nMin === 'number' && typeof modelDetail.nMax === 'number' && (
                <Box position="relative">
                  <Tooltip title={t('numberTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('number')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <WithAwareness
                    sx={{ top: -2, right: -4 }}
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[value.id, 'n']}>
                    <SliderNumberField
                      readOnly={readOnly}
                      min={modelDetail.nMin}
                      max={modelDetail.nMax}
                      step={1}
                      value={value.n ?? modelDetail.nDefault}
                      onChange={(_, v) => (value.n = v)}
                      sx={{ flex: 1 }}
                    />
                  </WithAwareness>
                </Box>
              )}

              {modelDetail.quality && modelDetail.quality.length > 0 && (
                <Box position="relative">
                  <Tooltip title={t('qualityTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('quality')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <WithAwareness
                    sx={{ top: -2, right: -4 }}
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[value.id, 'quality']}>
                    <TextField
                      hiddenLabel
                      select
                      SelectProps={{
                        readOnly,
                        autoWidth: true,
                      }}
                      value={value.quality ?? modelDetail.qualityDefault}
                      onChange={(e) => (value.quality = e.target.value)}>
                      {modelDetail.quality.map((i) => (
                        <MenuItem key={i} value={i}>
                          {i}
                        </MenuItem>
                      ))}
                    </TextField>
                  </WithAwareness>
                </Box>
              )}

              {modelDetail.responseFormat && modelDetail.responseFormat.length > 0 && (
                <Box position="relative">
                  <Tooltip title={t('responseFormatTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('responseFormat')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                  <Box>
                    <WithAwareness
                      sx={{ top: -2, right: -4 }}
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'responseFormat']}>
                      <TextField
                        hiddenLabel
                        select
                        SelectProps={{
                          readOnly,
                          autoWidth: true,
                        }}
                        value={value.responseFormat ?? modelDetail.responseFormatDefault}
                        onChange={(e) => (value.responseFormat = e.target.value)}>
                        {modelDetail.responseFormat.map((i) => (
                          <MenuItem key={i} value={i}>
                            {i}
                          </MenuItem>
                        ))}
                      </TextField>
                    </WithAwareness>
                  </Box>
                </Box>
              )}

              {modelDetail.size && modelDetail.size.length > 0 && (
                <Box position="relative">
                  <Tooltip title={t('sizeTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('size')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <WithAwareness
                    sx={{ top: -2, right: -4 }}
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[value.id, 'size']}>
                    <TextField
                      hiddenLabel
                      select
                      SelectProps={{
                        readOnly,
                        autoWidth: true,
                      }}
                      value={value.size ?? modelDetail.sizeDefault}
                      onChange={(e) => (value.size = e.target.value)}>
                      {modelDetail.size.map((i) => (
                        <MenuItem key={i} value={i}>
                          {i}
                        </MenuItem>
                      ))}
                    </TextField>
                  </WithAwareness>
                </Box>
              )}

              {modelDetail.style && modelDetail.style.length > 0 && (
                <Box position="relative">
                  <Tooltip title={t('styleTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('style')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <WithAwareness
                    sx={{ top: -2, right: -4 }}
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[value.id, 'style']}>
                    <TextField
                      hiddenLabel
                      select
                      SelectProps={{
                        readOnly,
                        autoWidth: true,
                      }}
                      value={value.style ?? modelDetail.styleDefault}
                      onChange={(e) => (value.style = e.target.value)}>
                      {modelDetail.style.map((i) => (
                        <MenuItem key={i} value={i}>
                          {i}
                        </MenuItem>
                      ))}
                    </TextField>
                  </WithAwareness>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
