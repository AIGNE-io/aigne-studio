import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ExpandMoreRounded, InfoOutlined } from '@mui/icons-material';
import {
  Box,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tooltip,
  Typography,
  formLabelClasses,
  typographyClasses,
} from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { SyntheticEvent, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../../components/awareness/awareness-indicator';
import WithAwareness from '../../components/awareness/with-awareness';
import ModelSelectField from '../../components/selector/model-select-field';
import SliderNumberField from '../../components/slider-number-field';
import Datasets from '../../components/template-form/datasets';
import Next from '../../components/template-form/next';
import Parameters from '../../components/template-form/parameters';
import { useReadOnly } from '../../contexts/session';
import { getSupportedModels } from '../../libs/common';
import { useProjectState, useTemplateCompare } from './state';

export default function SettingView({
  projectId,
  gitRef,
  template,
  originValue,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  originValue?: TemplateYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const [expanded, setExpanded] = useState<string | false>(false);

  const {
    state: { project },
  } = useProjectState(projectId, gitRef);

  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);
  const model = useMemo(
    () => supportedModels?.find((i) => i.model === (template.model || project?.model)),
    [template.model, project?.model, supportedModels]
  );

  const getModelTexts = () => {
    const arr = [
      {
        key: t('temperature'),
        value: template.temperature ?? project?.temperature ?? model?.temperatureDefault,
      },
      {
        key: t('topP'),
        value: template.topP ?? project?.topP ?? model?.topPDefault,
      },
      {
        key: t('presencePenalty'),
        value: template.presencePenalty ?? project?.presencePenalty ?? model?.presencePenaltyDefault,
      },
      {
        key: t('frequencyPenalty'),
        value: template.frequencyPenalty ?? project?.frequencyPenalty ?? model?.frequencyPenaltyDefault,
      },
      {
        key: t('maxTokens'),
        value: template.maxTokens ?? project?.maxTokens ?? model?.maxTokensDefault,
      },
    ];

    return arr
      .map((x) => {
        return `${x.key}: ${x.value}`;
      })
      .join(', ');
  };

  const handleChange = (panel: string) => (_e: SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const { getDiffBackground, getDiffColor } = useTemplateCompare({ value: template, originValue, disabled });

  if (!model) return null;

  return (
    <Stack
      py={2}
      sx={{
        '> div > *:last-child': { mb: 4 },
        [`.${typographyClasses.subtitle1}`]: { mb: 1 },
      }}>
      <Stack>
        <Typography
          variant="subtitle1"
          sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('variable')}
        </Typography>

        <Box px={2}>
          <Parameters readOnly={readOnly} form={template} originValue={originValue} />
        </Box>
      </Stack>

      <Stack sx={{ [`.${formLabelClasses.root}`]: { fontSize: 14 } }}>
        <Typography
          variant="subtitle1"
          sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('setting')}
        </Typography>

        <Stack mt={-0.5} direction="row" alignItems="center" px={3} position="relative">
          <FormLabel sx={{ minWidth: 60 }}>{t('public')}</FormLabel>

          <Box>
            <Switch
              checked={template.public ?? false}
              onChange={(_, checked) => !readOnly && (template.public = checked)}
            />
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" px={3} position="relative">
          <FormLabel sx={{ minWidth: 60 }}>{t('mode')}</FormLabel>

          <Box>
            <RadioGroup
              row
              value={template.mode ?? 'default'}
              onChange={(_, mode) => !readOnly && (template.mode = mode as any)}
              sx={{
                '.Mui-checked': {
                  ...getDiffColor({ path: 'mode', defaultValue: 'default' }),
                },
              }}>
              <FormControlLabel value="default" control={<Radio />} label={t('formMode')} />
              <FormControlLabel value="chat" control={<Radio />} label={t('chatMode')} />
            </RadioGroup>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" px={3} position="relative">
          <FormLabel sx={{ minWidth: 60 }}>{t('type')}</FormLabel>

          <Box>
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'name']}>
              <RadioGroup
                row
                value={template.type ?? 'text'}
                onChange={(_, type) => {
                  if (readOnly) return;
                  if (type === 'text') {
                    delete template.type;
                  } else {
                    template.type = type as any;
                  }
                }}
                sx={{
                  '.Mui-checked': {
                    ...getDiffColor({ path: 'type', defaultValue: 'text' }),
                  },
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
        </Stack>
      </Stack>

      <Stack>
        <Typography
          variant="subtitle1"
          sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('model')}
        </Typography>

        <Box px={2} position="relative">
          <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'model']}>
            <ModelSelectField
              fullWidth
              label={t('model')}
              value={template.model || project?.model || ''}
              onChange={(e) => (template.model = e.target.value)}
              InputProps={{ readOnly }}
              sx={{
                '.MuiInputBase-root': {
                  ...getDiffBackground('model'),
                },
              }}
            />
          </WithAwareness>

          <AwarenessIndicator
            projectId={projectId}
            gitRef={gitRef}
            path={[template.id, 'model']}
            sx={{ position: 'absolute', right: -16, top: 16 }}
          />
        </Box>

        <Accordion
          expanded={expanded === 'panel1'}
          onChange={handleChange('panel1')}
          elevation={0}
          disableGutters
          sx={{ mx: 1, ':before': { display: 'none' } }}>
          <AccordionSummary
            expandIcon={<ExpandMoreRounded />}
            sx={(theme) => ({ ...theme.typography.caption, color: 'text.secondary' })}>
            <>{getModelTexts()}</>
          </AccordionSummary>

          <AccordionDetails>
            <Box position="relative">
              <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('temperature')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

              <Box>
                <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'temperature']}>
                  <SliderNumberField
                    readOnly={readOnly}
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

            <Box position="relative">
              <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('topP')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

              <Box>
                <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'topP']}>
                  <SliderNumberField
                    readOnly={readOnly}
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

            <Box position="relative">
              <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('presencePenalty')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

              <Box>
                <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'presencePenalty']}>
                  <SliderNumberField
                    readOnly={readOnly}
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

            <Box position="relative">
              <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('frequencyPenalty')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

              <Box>
                <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'frequencyPenalty']}>
                  <SliderNumberField
                    readOnly={readOnly}
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

            <Box position="relative">
              <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
                <FormLabel>
                  {t('maxTokens')}
                  <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                </FormLabel>
              </Tooltip>

              <Box>
                <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'maxTokens']}>
                  <SliderNumberField
                    readOnly={readOnly}
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
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Stack>
        <Typography
          variant="subtitle1"
          sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('dataset')}
        </Typography>

        <Box px={2}>
          <Datasets readOnly={readOnly} form={template} originValue={originValue} />
        </Box>
      </Stack>

      {template.type !== 'image' && (
        <Stack
          sx={{
            '.MuiInputBase-root': {
              ...getDiffBackground('next'),
            },
          }}>
          <Typography
            variant="subtitle1"
            sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
            {t('next')}
          </Typography>

          <Box px={2}>
            <Next readOnly={readOnly} projectId={projectId} gitRef={gitRef} form={template} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
