import { getSupportedModels } from '@app/libs/common';
import Settings from '@app/pages/project/icons/settings';
import { useProjectState } from '@app/pages/project/state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ExecuteBlockSelectByPrompt } from '@blocklet/ai-runtime/types';
import { InfoOutlined } from '@mui/icons-material';
import { Box, Button, ClickAwayListener, FormLabel, Paper, Popper, Stack, Tooltip } from '@mui/material';
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
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  value: ExecuteBlockSelectByPrompt;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();
  const { state } = useProjectState(projectId, gitRef);
  const { project } = state;
  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);

  const model = useMemo(() => {
    return supportedModels?.find((i) => i.model === (value.executeModel?.model || project?.model));
  }, [supportedModels, value.executeModel?.model, project?.model]);

  if (!value.executeModel) {
    value.executeModel = {
      model: 'gpt-3.5-turbo',
      temperature: 1,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      maxTokens: undefined,
    };
  }

  return (
    <Stack position="relative" py={1} gap={1}>
      <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
        <ModelSelectField
          fullWidth
          label={t('model')}
          value={value.executeModel?.model || project?.model || ''}
          onChange={(e) => {
            value.executeModel!.model = e.target.value;
          }}
          InputProps={{ readOnly }}
        />
      </WithAwareness>

      {model && (
        <>
          {!isNil(model.temperatureMin) && (
            <Box position="relative">
              <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('temperature')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

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
                  value={value.executeModel?.temperature ?? project?.temperature ?? model.temperatureDefault}
                  onChange={(_, v) => (value.executeModel!.temperature = v)}
                />
              </WithAwareness>
            </Box>
          )}

          {!isNil(model.topPMin) && (
            <Box position="relative">
              <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('topP')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

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
                  value={value.executeModel?.topP ?? project?.topP ?? model.topPDefault}
                  onChange={(_, v) => (value.executeModel!.topP = v)}
                  sx={{ flex: 1 }}
                />
              </WithAwareness>
            </Box>
          )}

          {!isNil(model.presencePenaltyMin) && (
            <Box position="relative">
              <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('presencePenalty')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

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
                    value.executeModel?.presencePenalty ?? project?.presencePenalty ?? model.presencePenaltyDefault
                  }
                  onChange={(_, v) => (value.executeModel!.presencePenalty = v)}
                />
              </WithAwareness>
            </Box>
          )}

          {!isNil(model.frequencyPenaltyMin) && (
            <Box position="relative">
              <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('frequencyPenalty')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

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
                    value.executeModel?.frequencyPenalty ?? project?.frequencyPenalty ?? model.frequencyPenaltyDefault
                  }
                  onChange={(_, v) => (value.executeModel!.frequencyPenalty = v)}
                />
              </WithAwareness>
            </Box>
          )}

          {!isNil(model.maxTokensMin) && (
            <Box position="relative">
              <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('maxTokens')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

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
                  value={value.executeModel?.maxTokens ?? project?.maxTokens ?? model.maxTokensDefault}
                  onChange={(_, v) => (value.executeModel!.maxTokens = v)}
                />
              </WithAwareness>
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}

export function ModelPopper({ children }: { children: ReactElement }) {
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
        <Settings sx={{ fontSize: 18 }} />
      </Button>
      <Popper
        open={isVisible}
        anchorEl={buttonRef.current}
        placement="bottom-end"
        sx={{ zIndex: (theme) => theme.zIndex.modal }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setIsVisible(false);
          }}>
          <Paper sx={{ p: 3, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>{children}</Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
