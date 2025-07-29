import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultImageModel, getSupportedImagesModels } from '@blocklet/ai-runtime/common';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import { Box, FormLabel, MenuItem, TextField, Tooltip } from '@mui/material';
import { useMemo } from 'react';
import { useAsync } from 'react-use';
import { useAssistantCompare } from 'src/pages/project/state';

import WithAwareness from '../../awareness/with-awareness';
import ModelSelectField from '../../selector/model-select-field';
import SliderNumberField from '../../slider-number-field';

export default function ImageFileSetting({
  projectId,
  gitRef,
  value,
  readOnly = undefined,
  compareValue = undefined,
  isRemoteCompare = undefined,
}: {
  projectId: string;
  gitRef: string;
  value: ImageAssistantYjs;
  readOnly?: boolean;
  compareValue?: ImageAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const { value: supportedModels } = useAsync(() => getSupportedImagesModels(), []);
  const model = value.model || defaultImageModel;
  const modelDetail = useMemo(() => {
    return supportedModels?.find((i) => i.model === model);
  }, [model, supportedModels]);
  const icon = <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 16, color: '#9CA3AF', mt: 0.25 }} />;

  return (
    <>
      <Box
        className="between"
        sx={{
          position: 'relative',
        }}>
        <Box
          sx={{
            flex: 1,
          }}>
          <FormLabel>{t('model')}</FormLabel>
        </Box>

        <Box
          sx={{
            flex: 1,
          }}>
          <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
            <ModelSelectField
              fullWidth
              hiddenLabel
              isImageModel
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
      </Box>
      {modelDetail && (
        <>
          {typeof modelDetail.nMin === 'number' && typeof modelDetail.nMax === 'number' && (
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip
                  title={t('numberTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('number')}
                    {icon}
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                }}>
                <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'n']}>
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
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip
                  title={t('qualityTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('quality')}
                    {icon}
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'quality']}>
                  <TextField
                    hiddenLabel
                    select
                    value={value.quality ?? modelDetail.qualityDefault}
                    onChange={(e) => (value.quality = e.target.value)}
                    slotProps={{
                      select: {
                        readOnly,
                        autoWidth: true,
                        sx: { backgroundColor: getDiffBackground('quality') },
                      },
                    }}>
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
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip
                  title={t('sizeTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('size')}
                    {icon}
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'size']}>
                  <TextField
                    hiddenLabel
                    select
                    value={value.size ?? modelDetail.sizeDefault}
                    onChange={(e) => (value.size = e.target.value)}
                    slotProps={{
                      select: {
                        readOnly,
                        autoWidth: true,
                        sx: { backgroundColor: getDiffBackground('size') },
                      },
                    }}>
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
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip
                  title={t('styleTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('style')}
                    {icon}
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'style']}>
                  <TextField
                    hiddenLabel
                    select
                    value={value.style ?? modelDetail.styleDefault}
                    onChange={(e) => (value.style = e.target.value)}
                    slotProps={{
                      select: {
                        readOnly,
                        autoWidth: true,
                        sx: { backgroundColor: getDiffBackground('style') },
                      },
                    }}>
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
        </>
      )}
    </>
  );
}
