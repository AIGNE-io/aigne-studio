import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { InfoOutlined, SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  styled,
} from '@mui/material';
import { cloneDeep, isNil, pick } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { UpdateProjectInput } from '../../../../api/src/routes/project';
import Loading from '../../../components/loading';
import Avatar from '../../../components/project-settings/avatar';
import ModelSelectField from '../../../components/selector/model-select-field';
import SliderNumberField from '../../../components/slider-number-field';
import UploaderProvider from '../../../contexts/uploader';
import { getErrorMessage } from '../../../libs/api';
import { defaultBranch, useProjectState } from '../state';

const init = {
  name: '',
  description: '',
  icon: '',
  model: '',
  temperature: 1,
  topP: 1,
  presencePenalty: 1,
  frequencyPenalty: 1,
  gitType: 'default',
};

export default function ProjectSettings() {
  const { t } = useLocaleContext();
  const { projectId = '' } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId`');

  const [submitLoading, setLoading] = useState(false);
  const [value, setValue] = useState<UpdateProjectInput>(init);
  const isSubmit = useRef(false);

  const { state, updateProject } = useProjectState(projectId, defaultBranch);
  const { project, error, loading } = state;

  useEffect(() => {
    if (project) {
      const merge = pick({ ...init, ...project }, [
        'name',
        'description',
        'icon',
        'model',
        'temperature',
        'topP',
        'presencePenalty',
        'frequencyPenalty',
        'gitType',
      ]);

      setValue(merge);
    }
  }, [project]);

  const set = (key: string, value: any) => {
    setValue((r) => ({ ...r, [key]: value }));
  };

  const versions = [
    {
      value: 'simple',
      title: t('projectSetting.gitType.simple.title'),
      subTitle: t('projectSetting.gitType.simple.subTitle'),
    },
    {
      value: 'default',
      title: t('projectSetting.gitType.default.title'),
      subTitle: t('projectSetting.gitType.default.subTitle'),
    },
  ];

  const onSubmit = async () => {
    const temp: any = cloneDeep(value);
    isSubmit.current = true;

    Object.keys(temp).forEach((t: string) => {
      if (isNil(temp[t])) {
        delete temp[t];
      }
    });

    setLoading(true);

    try {
      await updateProject(projectId, temp);
      Toast.success('Saved');
    } catch (error) {
      Toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      Toast.error(getErrorMessage(error));
    }
  }, [error]);

  if (loading && !isSubmit.current) {
    return <Loading fixed />;
  }

  if (error) {
    return null;
  }

  return (
    <UploaderProvider>
      <SettingsContainer sx={{ mt: 2 }} maxWidth="sm">
        <form onSubmit={(e) => e.preventDefault()}>
          <Box my={2}>
            <Box component="h3">{t('projectSetting.baseInfo')}</Box>

            <Box display="flex" alignItems="center" p={1}>
              <Avatar value={value.icon ?? ''} onChange={(d: any) => set('icon', d)} />

              <Stack spacing={1} flex={1} ml={4}>
                <TextField
                  size="small"
                  label={t('projectSetting.name')}
                  sx={{ flex: 1 }}
                  value={value.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                />

                <TextField
                  size="small"
                  label={t('projectSetting.description')}
                  multiline
                  rows={4}
                  sx={{ width: 1 }}
                  value={value.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Stack>
            </Box>
          </Box>

          <Box my={2}>
            <Box component="h3">{t('projectSetting.defaultModel')}</Box>

            <Box>
              <Box className="prefer-inline">
                <Box>
                  <FormLabel>{t('model')}</FormLabel>
                </Box>

                <Box>
                  <ModelSelectField
                    hiddenLabel
                    fullWidth
                    value={value.model ?? ''}
                    onChange={(e) => set('model', e.target.value)}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('temperature')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box>
                  <SliderNumberField
                    min={0}
                    max={2}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={value.temperature ?? 1}
                    onChange={(_, v) => set('temperature', v)}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('topP')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box>
                  <SliderNumberField
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={value.topP ?? 1}
                    onChange={(_, v) => set('topP', v)}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('presencePenalty')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box>
                  <SliderNumberField
                    min={-2}
                    max={2}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={value.presencePenalty ?? 1}
                    onChange={(_, v) => set('presencePenalty', v)}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('frequencyPenalty')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box>
                  <SliderNumberField
                    min={-2}
                    max={2}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={value.frequencyPenalty ?? 1}
                    onChange={(_, v) => set('frequencyPenalty', v)}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box my={2}>
            <Box component="h3">{t('projectSetting.gitType.title')}</Box>

            <Box>
              <FormControl className="version">
                <RadioGroup value={value.gitType ?? 'default'} onChange={(e) => set('gitType', e.target.value)}>
                  {versions.map((version) => {
                    return (
                      <FormControlLabel
                        key={version.value}
                        sx={{ p: 1 }}
                        value={version.value}
                        control={<Radio />}
                        label={
                          <>
                            <Box className="title">{version.title}</Box>
                            <Box className="subTitle">{version.subTitle}</Box>
                          </>
                        }
                      />
                    );
                  })}
                </RadioGroup>
              </FormControl>
            </Box>
          </Box>

          <Box display="flex" justifyContent="flex-end" mb={5}>
            <LoadingButton
              variant="contained"
              loadingPosition="start"
              loading={submitLoading}
              startIcon={<SaveRounded />}
              onClick={onSubmit}>
              {t('save')}
            </LoadingButton>
          </Box>
        </form>
      </SettingsContainer>
    </UploaderProvider>
  );
}

const SettingsContainer = styled(Container)`
  .prefer-inline {
    display: table-row;

    > div {
      display: table-cell;
      padding: 8px;
      vertical-align: middle;

      :first-of-type {
        white-space: nowrap;
      }

      :nth-of-type(2) {
        width: 100%;
        position: relative;
      }
    }
  }

  .version {
    .subTitle {
      color: rgba(0, 0, 0, 0.6);
      font-weight: 400;
      font-size: 0.75rem;
    }
  }
`;
