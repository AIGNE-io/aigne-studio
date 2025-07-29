import { getSupportedModels } from '@api/libs/common';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ExecuteBlockSelectByPromptYjs, FileTypeYjs, OnTaskCompletion, isAssistant } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Icon } from '@iconify-icon/react';
import SettingIcon from '@iconify-icons/tabler/settings-2';
import { InfoOutlined } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  ClickAwayListener,
  FormControl,
  FormLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Popper,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
} from '@mui/material';
import { sortBy } from 'lodash';
import isNil from 'lodash/isNil';
import { ReactElement, useMemo, useRef, useState } from 'react';
import { useAsync } from 'react-use';

import WithAwareness from '../awareness/with-awareness';
import ModelSelectField from '../selector/model-select-field';
import SliderNumberField from '../slider-number-field';

export function ModelSetting({
  projectId,
  gitRef,
  value,
  readOnly = undefined,
  files,
}: {
  projectId: string;
  gitRef: string;
  value: ExecuteBlockSelectByPromptYjs;
  readOnly?: boolean;
  files: Partial<{
    [key: string]: FileTypeYjs;
  }>;
}) {
  const { t } = useLocaleContext();
  const { projectSetting } = useProjectStore(projectId, gitRef);
  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);

  const model = useMemo(() => {
    return supportedModels?.find((i) => i.model === (value.executeModel?.model || projectSetting?.model));
  }, [supportedModels, value.executeModel?.model, projectSetting?.model]);

  if (!value.executeModel) {
    value.executeModel = {
      model: projectSetting?.model || 'gpt-4o-mini',
      temperature: 1,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      maxTokens: undefined,
    };
  }

  const tools = sortBy(
    value.tools
      ? Object.values(value.tools)
          .map(({ index, data: tool }) => {
            const f = files[tool.id];
            const file = f && isAssistant(f) ? f : undefined;
            if (!file) return null;
            return { index, data: { ...tool, file } };
          })
          .filter(isNonNullable)
      : []
  );

  const toolId = tools.filter((i) => i.data.onEnd === OnTaskCompletion.EXIT).map((i) => i.data.id) ?? [];

  const handleChange = (event: SelectChangeEvent<typeof toolId>) => {
    const {
      target: { value: selectValue },
    } = event;

    const data = typeof selectValue === 'string' ? selectValue.split(',') : selectValue;

    const toolIds = tools.map((tool) => tool.data.id);

    toolIds.forEach((id) => {
      const tool = value.tools?.[id];
      if (tool) {
        tool.data.onEnd = data.includes(id) ? OnTaskCompletion.EXIT : undefined;
      }
    });
  };

  return (
    <Stack
      sx={{
        position: 'relative',
        py: 1,
        gap: 1,
      }}>
      <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
        <ModelSelectField
          fullWidth
          label={t('model')}
          value={value.executeModel?.model || projectSetting?.model || ''}
          onChange={(e) => {
            value.executeModel!.model = e.target.value;
          }}
          InputProps={{ readOnly }}
          sx={{ border: '1px solid #E5E7EB' }}
        />
      </WithAwareness>
      {model && (
        <>
          {!isNil(model.temperatureMin) && (
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                  <FormLabel>
                    {t('temperature')}
                    <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'temperature']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.temperatureMin}
                    max={model.temperatureMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={value.executeModel?.temperature ?? projectSetting?.temperature ?? model.temperatureDefault}
                    onChange={(_, v) => (value.executeModel!.temperature = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.topPMin) && (
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                  <FormLabel>
                    {t('topP')}
                    <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'topP']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.topPMin}
                    max={model.topPMax}
                    step={0.1}
                    value={value.executeModel?.topP ?? projectSetting?.topP ?? model.topPDefault}
                    onChange={(_, v) => (value.executeModel!.topP = v)}
                    sx={{ flex: 1 }}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.presencePenaltyMin) && (
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
                  <FormLabel>
                    {t('presencePenalty')}
                    <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'presencePenalty']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.presencePenaltyMin}
                    max={model.presencePenaltyMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={
                      value.executeModel?.presencePenalty ??
                      projectSetting?.presencePenalty ??
                      model.presencePenaltyDefault
                    }
                    onChange={(_, v) => (value.executeModel!.presencePenalty = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.frequencyPenaltyMin) && (
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                  <FormLabel>
                    {t('frequencyPenalty')}
                    <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'frequencyPenalty']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.frequencyPenaltyMin}
                    max={model.frequencyPenaltyMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={
                      value.executeModel?.frequencyPenalty ??
                      projectSetting?.frequencyPenalty ??
                      model.frequencyPenaltyDefault
                    }
                    onChange={(_, v) => (value.executeModel!.frequencyPenalty = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.maxTokensMin) && (
            <Box
              className="between"
              sx={{
                position: 'relative',
              }}>
              <Box
                sx={{
                  flex: 1,
                }}>
                <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
                  <FormLabel>
                    {t('maxTokens')}
                    <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                  </FormLabel>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  flex: 1,
                }}>
                <WithAwareness
                  sx={{ top: -2, right: -4 }}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'maxTokens']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.maxTokensMin}
                    max={model.maxTokensMax}
                    step={1}
                    sx={{ flex: 1 }}
                    value={Math.min(
                      value.executeModel?.maxTokens ?? projectSetting?.maxTokens ?? model.maxTokensDefault ?? 0,
                      model.maxTokensMax ?? 0
                    )}
                    onChange={(_, v) => (value.executeModel!.maxTokens = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}
        </>
      )}
      {!!tools.length && (
        <FormControl size="small">
          <InputLabel>Stop Tools</InputLabel>
          <Select
            multiple
            value={toolId}
            onChange={handleChange}
            input={<OutlinedInput label="Stop Tools" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const file = tools.find((i) => i.data.id === value);
                  return <Chip key={value} label={file?.data.file.name} />;
                })}
              </Box>
            )}>
            {tools?.map(({ data: { id, file } }) => {
              return (
                <MenuItem key={id} value={id}>
                  <Checkbox checked={toolId.indexOf(id || '') > -1} />
                  <ListItemText primary={file.name} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      )}
    </Stack>
  );
}

export function ModelPopper({ children }: { children: ReactElement<any> }) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Button
        sx={{ minWidth: 24, minHeight: 24, p: 0 }}
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(true);
        }}>
        <Box
          component={Icon}
          icon={SettingIcon}
          sx={{
            fontSize: 18,
          }}
        />
      </Button>
      <Popper
        open={isVisible}
        anchorEl={buttonRef.current}
        placement="bottom-start"
        sx={{ zIndex: (theme) => theme.zIndex.modal }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setIsVisible(false);
          }}>
          <Paper sx={{ p: 3, width: 380, maxHeight: '80vh', overflow: 'auto' }}>{children}</Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
