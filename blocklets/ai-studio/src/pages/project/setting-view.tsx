import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { InfoOutlined } from '@mui/icons-material';
import {
  Box,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Tooltip,
  Typography,
  formLabelClasses,
} from '@mui/material';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../../components/awareness/awareness-indicator';
import WithAwareness from '../../components/awareness/with-awareness';
import ModelSelectField from '../../components/selector/model-select-field';
import SliderNumberField from '../../components/slider-number-field';
import Datasets from '../../components/template-form/datasets';
import Next from '../../components/template-form/next';
import Parameters from '../../components/template-form/parameters';
import { getSupportedModels } from '../../libs/common';
import { useProjectState } from './state';

export default function SettingView({
  projectId,
  gitRef,
  template,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  const {
    state: { project },
  } = useProjectState(projectId, gitRef);

  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);
  const model = useMemo(
    () => supportedModels?.find((i) => i.model === (template.model || project?.model)),
    [template.model, project?.model, supportedModels]
  );

  if (!model) return null;

  return (
    <Stack py={2}>
      <Stack gap={2} sx={{ '> *:last-child': { mb: 2 }, [`.${formLabelClasses.root}`]: { fontSize: 14 } }}>
        <Box px={2} position="relative">
          <FormLabel>{t('status')}</FormLabel>

          <Box>
            <RadioGroup
              row
              value={template.public ?? false}
              onChange={(_, status) => (template.public = status as any)}>
              <FormControlLabel value control={<Radio />} label={t('publicStatus')} />
              <FormControlLabel value={false} control={<Radio />} label={t('privateStatus')} />
            </RadioGroup>
          </Box>
        </Box>

        <Box px={2} position="relative">
          <FormLabel>{t('mode')}</FormLabel>

          <Box>
            <RadioGroup row value={template.mode ?? 'default'} onChange={(_, mode) => (template.mode = mode as any)}>
              <FormControlLabel value="default" control={<Radio />} label={t('formMode')} />
              <FormControlLabel value="chat" control={<Radio />} label={t('chatMode')} />
            </RadioGroup>
          </Box>
        </Box>

        <Box px={2} position="relative">
          <FormLabel>{t('type')}</FormLabel>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'name']}>
              <RadioGroup
                row
                value={template.type ?? 'text'}
                onChange={(_, type) => {
                  if (type === 'text') {
                    delete template.type;
                  } else {
                    template.type = type as any;
                  }
                }}>
                <FormControlLabel value="text" control={<Radio />} label={t('text')} />
                <FormControlLabel value="image" control={<Radio />} label={t('image')} />
              </RadioGroup>
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[template.id, 'name']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>
        </Box>

        <Typography variant="h6" sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('model')}
        </Typography>

        <Box px={2} position="relative">
          <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'model']}>
            <ModelSelectField
              fullWidth
              label={t('model')}
              value={template.model || project?.model || ''}
              onChange={(e) => (template.model = e.target.value)}
            />
          </WithAwareness>

          <AwarenessIndicator
            projectId={projectId}
            gitRef={gitRef}
            path={[template.id, 'model']}
            sx={{ position: 'absolute', right: -16, top: 16 }}
          />
        </Box>

        <Box px={2} position="relative">
          <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
            <FormLabel>
              {t('temperature')}
              <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
            </FormLabel>
          </Tooltip>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'temperature']}>
              <SliderNumberField
                min={model.temperatureMin}
                max={model.temperatureMax}
                step={0.1}
                sx={{ flex: 1 }}
                value={template.temperature ?? project?.temperature ?? model.temperatureDefault}
                onChange={(_, v) => (template.temperature = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[template.id, 'temperature']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>
        </Box>

        <Box px={2} position="relative">
          <Tooltip title={t('topPTip')} placement="top" disableInteractive>
            <FormLabel>
              {t('topP')}
              <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
            </FormLabel>
          </Tooltip>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'topP']}>
              <SliderNumberField
                min={model.topPMin}
                max={model.topPMax}
                step={0.1}
                value={template.topP ?? project?.topP ?? model.topPDefault}
                onChange={(_, v) => (template.topP = v)}
                sx={{ flex: 1 }}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[template.id, 'topP']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>
        </Box>

        <Box px={2} position="relative">
          <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
            <FormLabel>
              {t('presencePenalty')}
              <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
            </FormLabel>
          </Tooltip>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'presencePenalty']}>
              <SliderNumberField
                min={model.presencePenaltyMin}
                max={model.presencePenaltyMax}
                step={0.1}
                sx={{ flex: 1 }}
                value={template.presencePenalty ?? project?.presencePenalty ?? model.presencePenaltyDefault}
                onChange={(_, v) => (template.presencePenalty = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[template.id, 'presencePenalty']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>
        </Box>

        <Box px={2} position="relative">
          <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
            <FormLabel>
              {t('frequencyPenalty')}
              <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
            </FormLabel>
          </Tooltip>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'frequencyPenalty']}>
              <SliderNumberField
                min={model.frequencyPenaltyMin}
                max={model.frequencyPenaltyMax}
                step={0.1}
                sx={{ flex: 1 }}
                value={template.frequencyPenalty ?? project?.frequencyPenalty ?? model.frequencyPenaltyDefault}
                onChange={(_, v) => (template.frequencyPenalty = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[template.id, 'frequencyPenalty']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>
        </Box>

        <Box px={2} position="relative">
          <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
            <FormLabel>
              {t('maxTokens')}
              <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
            </FormLabel>
          </Tooltip>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'maxTokens']}>
              <SliderNumberField
                min={model.maxTokensMin}
                max={model.maxTokensMax}
                step={1}
                sx={{ flex: 1 }}
                value={template.maxTokens ?? project?.maxTokens ?? model.maxTokensDefault}
                onChange={(_, v) => (template.maxTokens = v)}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[template.id, 'maxTokens']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>
        </Box>
      </Stack>

      <Stack sx={{ '> *:last-child': { mb: 2 } }}>
        <Typography variant="h6" sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('variable')}
        </Typography>

        <Box px={2}>
          <Parameters form={template} />
        </Box>
      </Stack>

      <Stack sx={{ '> *:last-child': { mb: 2 } }}>
        <Typography variant="h6" sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('dataset')}
        </Typography>

        <Box px={2}>
          <Datasets form={template} />
        </Box>
      </Stack>

      {template.type !== 'image' && (
        <Stack sx={{ '> *:last-child': { mb: 2 } }}>
          <Typography variant="h6" sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
            {t('next')}
          </Typography>

          <Box px={2}>
            <Next projectId={projectId} gitRef={gitRef} form={template} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
