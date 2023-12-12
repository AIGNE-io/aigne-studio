import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SaveRounded } from '@mui/icons-material';
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
import equal from 'fast-deep-equal';
import cloneDeep from 'lodash/cloneDeep';
import isNil from 'lodash/isNil';
import pick from 'lodash/pick';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, unstable_useBlocker as useBlocker, useParams } from 'react-router-dom';
import { useAsync } from 'react-use';

import { UpdateProjectInput } from '../../../../api/src/routes/project';
import Loading from '../../../components/loading';
import Avatar from '../../../components/project-settings/avatar';
import ModelSelectField from '../../../components/selector/model-select-field';
import SliderNumberField from '../../../components/slider-number-field';
import { useReadOnly } from '../../../contexts/session';
import UploaderProvider from '../../../contexts/uploader';
import { getErrorMessage } from '../../../libs/api';
import { getSupportedModels } from '../../../libs/common';
import useDialog from '../../../utils/use-dialog';
import InfoOutlined from '../icons/question';
import { defaultBranch, useProjectState } from '../state';
import RemoteRepoSetting from './remote-repo-setting';

const init = {
  name: '',
  description: '',
  icon: '',
  model: '',
  temperature: 1,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  maxTokens: undefined,
  gitType: 'simple',
};

export default function ProjectSettings() {
  const { t } = useLocaleContext();
  const { projectId = '' } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId`');

  const readOnly = useReadOnly({ ref: defaultBranch });
  const { dialog, showDialog } = useDialog();
  const [submitLoading, setLoading] = useState(false);
  const [value, setValue] = useState<UpdateProjectInput>(init);
  const isSubmit = useRef(false);
  const origin = useRef<UpdateProjectInput>();

  const { value: supportedModels, loading: getSupportedModelsLoading } = useAsync(() => getSupportedModels(), []);
  const model = useMemo(() => supportedModels?.find((i) => i.model === value.model), [value.model, supportedModels]);

  const {
    state: { project, error, ...state },
    updateProject,
  } = useProjectState(projectId, defaultBranch);
  if (error) throw error;

  const loading = state.loading || getSupportedModelsLoading;

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
        'maxTokens',
        'gitType',
      ]);

      origin.current = merge;
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

  const changed = useMemo(() => {
    return !!origin.current && !!value && !equal(origin.current, value);
  }, [value]);

  useBeforeUnload((e) => {
    if (changed) e.returnValue = 'Discard changes?';
  });

  const blocker = useBlocker(changed);

  useEffect(() => {
    if (changed && blocker.state === 'blocked') {
      showDialog({
        maxWidth: 'xs',
        fullWidth: true,
        title: t('alert.unsave.title'),
        content: t('alert.unsave.content'),
        okText: t('save'),
        okColor: 'primary',
        cancelText: t('alert.cancel'),
        middleText: t('alert.discard'),
        middleColor: 'error',
        onOk: async () => {
          await onSubmit();
          blocker.proceed();
        },
        onMiddleClick: () => {
          blocker.proceed();
        },
        onCancel: () => {
          blocker.reset();
        },
      });
    }
  }, [blocker.state, changed, t, value]);

  if (loading && !isSubmit.current && !project) {
    return <Loading fixed />;
  }

  return (
    <Box overflow="auto">
      <UploaderProvider>
        <SettingsContainer sx={{ pb: 10 }} maxWidth="sm">
          <Stack gap={2}>
            <Form onSubmit={(e) => e.preventDefault()}>
              <Box>
                <Box component="h3" mt={0}>
                  {t('projectSetting.baseInfo')}
                </Box>

                <Box display="flex" alignItems="center">
                  <Avatar value={value.icon ?? ''} onChange={(d: any) => set('icon', d)} />

                  <Stack spacing={1} flex={1} ml={4}>
                    <TextField
                      label={t('projectSetting.name')}
                      sx={{ flex: 1 }}
                      value={value.name ?? ''}
                      onChange={(e) => set('name', e.target.value)}
                      InputProps={{ readOnly }}
                    />

                    <TextField
                      label={t('projectSetting.description')}
                      multiline
                      rows={4}
                      sx={{ width: 1 }}
                      value={value.description ?? ''}
                      onChange={(e) => set('description', e.target.value)}
                      InputProps={{ readOnly }}
                    />
                  </Stack>
                </Box>
              </Box>

              <Box>
                <Box component="h3" mt={4}>
                  {t('projectSetting.defaultModel')}
                </Box>

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
                        InputProps={{ readOnly }}
                      />
                    </Box>
                  </Box>

                  {model && (
                    <>
                      <Box className="prefer-inline">
                        <Box>
                          <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                            <FormLabel>
                              {t('temperature')}
                              <InfoOutlined
                                fontSize="small"
                                sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }}
                              />
                            </FormLabel>
                          </Tooltip>
                        </Box>

                        <Box>
                          <SliderNumberField
                            readOnly={readOnly}
                            min={model.temperatureMin}
                            max={model.temperatureMax}
                            step={0.1}
                            sx={{ flex: 1 }}
                            value={value.temperature ?? model.temperatureDefault}
                            onChange={(_, v) => set('temperature', v)}
                          />
                        </Box>
                      </Box>

                      <Box className="prefer-inline">
                        <Box>
                          <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                            <FormLabel>
                              {t('topP')}
                              <InfoOutlined
                                fontSize="small"
                                sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }}
                              />
                            </FormLabel>
                          </Tooltip>
                        </Box>

                        <Box>
                          <SliderNumberField
                            readOnly={readOnly}
                            min={model.topPMin}
                            max={model.topPMax}
                            step={0.1}
                            value={value.topP ?? model.topPDefault}
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
                              <InfoOutlined
                                fontSize="small"
                                sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }}
                              />
                            </FormLabel>
                          </Tooltip>
                        </Box>

                        <Box>
                          <SliderNumberField
                            readOnly={readOnly}
                            min={model.presencePenaltyMin}
                            max={model.presencePenaltyMax}
                            step={0.1}
                            sx={{ flex: 1 }}
                            value={value.presencePenalty ?? model.presencePenaltyDefault}
                            onChange={(_, v) => set('presencePenalty', v)}
                          />
                        </Box>
                      </Box>

                      <Box className="prefer-inline">
                        <Box>
                          <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                            <FormLabel>
                              {t('frequencyPenalty')}
                              <InfoOutlined
                                fontSize="small"
                                sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }}
                              />
                            </FormLabel>
                          </Tooltip>
                        </Box>

                        <Box>
                          <SliderNumberField
                            readOnly={readOnly}
                            min={model.frequencyPenaltyMin}
                            max={model.frequencyPenaltyMax}
                            step={0.1}
                            sx={{ flex: 1 }}
                            value={value.frequencyPenalty ?? model.frequencyPenaltyDefault}
                            onChange={(_, v) => set('frequencyPenalty', v)}
                          />
                        </Box>
                      </Box>

                      <Box className="prefer-inline">
                        <Box>
                          <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
                            <FormLabel>
                              {t('maxTokens')}
                              <InfoOutlined
                                fontSize="small"
                                sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }}
                              />
                            </FormLabel>
                          </Tooltip>
                        </Box>

                        <Box>
                          <SliderNumberField
                            readOnly={readOnly}
                            min={model.maxTokensMin}
                            max={model.maxTokensMax}
                            step={1}
                            sx={{ flex: 1 }}
                            value={value.maxTokens ?? model.maxTokensDefault}
                            onChange={(_, v) => set('maxTokens', v)}
                          />
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>

              <Box>
                <Box component="h3" mt={4}>
                  {t('projectSetting.gitType.title')}
                </Box>

                <Box>
                  <FormControl className="version">
                    <RadioGroup
                      value={value.gitType ?? 'default'}
                      onChange={(e) => !readOnly && set('gitType', e.target.value)}>
                      {versions.map((version) => {
                        return (
                          <FormControlLabel
                            key={version.value}
                            sx={{ mb: 1, mr: 0, ':last-child': { m: 0 }, alignItems: 'flex-start' }}
                            value={version.value}
                            control={<Radio />}
                            label={
                              <Box mt={0.25} ml={0.5}>
                                <Box className="title">{version.title}</Box>
                                <Box className="subTitle">{version.subTitle}</Box>
                              </Box>
                            }
                          />
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <LoadingButton
                  disabled={readOnly}
                  variant="contained"
                  loadingPosition="start"
                  loading={submitLoading}
                  startIcon={<SaveRounded />}
                  onClick={onSubmit}>
                  {t('save')}
                </LoadingButton>
              </Box>
            </Form>

            <Box
              sx={{ border: '1px solid #ddd', padding: 2, borderRadius: (theme) => `${theme.shape.borderRadius}px` }}>
              <Box component="h3" sx={{ marginTop: 0 }}>
                {t('remoteGitRepo')}
              </Box>
              <RemoteRepoSetting projectId={projectId} />
            </Box>
          </Stack>
        </SettingsContainer>
      </UploaderProvider>

      {dialog}
    </Box>
  );
}

const SettingsContainer = styled(Container)`
  margin-top: 16px;

  .prefer-inline {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    &:last-child {
      margin: 0;
    }

    > div {
      flex: 1;
      padding: 0 8px;
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

const Form = styled('form')`
  border: 1px solid #ddd;
  padding: 16px;
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
`;
