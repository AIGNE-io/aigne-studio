import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultImageModel, getSupportedImagesModels } from '@blocklet/ai-runtime/common';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { ExpandMoreRounded, InfoOutlined } from '@mui/icons-material';
import { Box, Collapse, FormLabel, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import { useAssistantCompare } from 'src/pages/project/state';

import WithAwareness from '../../awareness/with-awareness';
import ModelSelectField, { brandIcon } from '../../selector/model-select-field';
import SliderNumberField from '../../slider-number-field';

export default function ImageFileSetting({
  projectId,
  gitRef,
  value,
  readOnly,
  compareValue,
  isRemoteCompare,
  isOpen = false,
}: {
  projectId: string;
  gitRef: string;
  value: ImageAssistantYjs;
  readOnly?: boolean;
  compareValue?: ImageAssistantYjs;
  isRemoteCompare?: boolean;
  isOpen?: boolean;
}) {
  const { t } = useLocaleContext();

  const [open, setOpen] = useState(isOpen);

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const { value: supportedModels } = useAsync(() => getSupportedImagesModels(), []);
  const model = value.model || defaultImageModel;
  const modelDetail = useMemo(() => {
    return supportedModels?.find((i) => i.model === model);
  }, [model, supportedModels]);

  return (
    <Box sx={{ border: '1px solid #E5E7EB', p: '8px 16px', borderRadius: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '24px',
          color: '#030712',
          cursor: 'pointer',
        }}
        onClick={() => setOpen(!open)}>
        <Typography variant="subtitle2" mb={0}>
          {t('callPrompt')}
        </Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end">
          {!open && (
            <Stack direction="row" alignItems="center" gap={0.5}>
              {modelDetail && <Box className="center">{brandIcon(modelDetail!.brand)}</Box>}
              <Typography variant="subtitle3" color="#030712">
                {model}
              </Typography>
            </Stack>
          )}
        </Stack>

        <ExpandMoreRounded
          sx={{
            transform: open ? 'rotateZ(180deg)' : undefined,
            transition: (theme) => theme.transitions.create('all'),
          }}
        />
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
                InputProps={{ readOnly, sx: { backgroundColor: getDiffBackground('model') } }}
              />
            </WithAwareness>
          </Box>

          {modelDetail && (
            <Box>
              {typeof modelDetail.nMin === 'number' && typeof modelDetail.nMax === 'number' && (
                <Box position="relative" className="between">
                  <Box flex={1}>
                    <Tooltip title={t('numberTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('number')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1}>
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
                        sx={{ flex: 1, sx: { backgroundColor: getDiffBackground('n') } }}
                      />
                    </WithAwareness>
                  </Box>
                </Box>
              )}

              {modelDetail.quality && modelDetail.quality.length > 0 && (
                <Box position="relative" className="between">
                  <Box flex={1}>
                    <Tooltip title={t('qualityTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('quality')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1} display="flex" justifyContent="flex-end">
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
                          sx: { backgroundColor: getDiffBackground('quality') },
                        }}
                        value={value.quality ?? modelDetail.qualityDefault}
                        onChange={(e) => (value.quality = e.target.value)}>
                        {(modelDetail.quality || []).map((i) => (
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
                <Box position="relative" className="between">
                  <Box flex={1}>
                    <Tooltip title={t('sizeTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('size')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1} display="flex" justifyContent="flex-end">
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
                          sx: { backgroundColor: getDiffBackground('size') },
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
                </Box>
              )}

              {modelDetail.style && modelDetail.style.length > 0 && (
                <Box position="relative" className="between">
                  <Box flex={1}>
                    <Tooltip title={t('styleTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('style')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1} display="flex" justifyContent="flex-end">
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
                          sx: { backgroundColor: getDiffBackground('style') },
                        }}
                        value={value.style ?? modelDetail.styleDefault}
                        onChange={(e) => (value.style = e.target.value)}>
                        {(modelDetail.style || []).map((i) => (
                          <MenuItem key={i} value={i}>
                            {i}
                          </MenuItem>
                        ))}
                      </TextField>
                    </WithAwareness>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
