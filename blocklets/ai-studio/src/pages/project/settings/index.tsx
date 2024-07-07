import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '@app/libs/constants';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { defaultTextModel, getSupportedModels } from '@blocklet/ai-runtime/common';
import { CloseRounded, SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  BoxProps,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Tabs,
  TextField,
  Theme,
  Tooltip,
  Typography,
  styled,
  tabClasses,
  useMediaQuery,
} from '@mui/material';
import Tab from '@mui/material/Tab';
import equal from 'fast-deep-equal';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';
import pick from 'lodash/pick';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useBlocker, useParams } from 'react-router-dom';
import { useAsync } from 'react-use';

import { UpdateProjectInput } from '../../../../api/src/routes/project';
import Loading from '../../../components/loading';
import Avatar from '../../../components/project-settings/avatar';
import ModelSelectField from '../../../components/selector/model-select-field';
import SliderNumberField from '../../../components/slider-number-field';
import { useReadOnly, useSessionContext } from '../../../contexts/session';
import { getErrorMessage } from '../../../libs/api';
import { getProjectIconUrl } from '../../../libs/project';
import useDialog from '../../../utils/use-dialog';
import InfoOutlined from '../icons/question';
import { useProjectState } from '../state';
import { useProjectStore } from '../yjs-state';
import AppearanceSetting from './appearance-setting';
import DidSpacesSetting from './did-spaces-setting';
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
  primaryColor: '#ffffff',
};

export default function ProjectSettings({ boxProps, onClose }: { boxProps?: BoxProps; onClose?: () => void }) {
  const { t } = useLocaleContext();
  const { projectId = '', ref: gitRef } = useParams();
  if (!projectId) throw new Error('Missing required params `projectId`');
  if (!gitRef) throw new Error('Missing required params `gitRef`');

  const readOnly = useReadOnly({ ref: getDefaultBranch() });
  const { dialog, showDialog } = useDialog();
  const [submitLoading, setLoading] = useState(false);
  const [value, setValue] = useState<UpdateProjectInput>(init);
  const isSubmit = useRef(false);
  const origin = useRef<UpdateProjectInput>();
  const { session } = useSessionContext();

  const tabListInfo: { list: string[] } = {
    list: [
      'basic',
      'modelInfo',
      'git',
      !isEmpty(session?.user?.didSpace?.endpoint) ? 'didSpaces' : '',
      'appearance',
    ].filter((x) => x),
  };
  const [currentTabIndex, setCurrentTabIndex] = useState<string | undefined>(tabListInfo.list[0]);

  const { value: supportedModels, loading: getSupportedModelsLoading } = useAsync(() => getSupportedModels(), []);
  const { config, setConfig } = useProjectStore(projectId, gitRef);
  const model = useMemo(
    () => supportedModels?.find((i) => i.model === config?.model?.model),
    [config?.model?.model, supportedModels]
  );
  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

  const {
    state: { project, error, ...state },
    updateProject,
  } = useProjectState(projectId, getDefaultBranch());
  if (error) throw error;

  const loading = state.loading || getSupportedModelsLoading;

  useEffect(() => {
    if (project) {
      const merge = pick({ ...init, ...project }, ['gitType', 'icon']);
      merge.icon = getProjectIconUrl(projectId, project.updatedAt, { original: true });

      origin.current = merge;
      setValue(merge);
    }
  }, [project, projectId]);

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
      await updateProject(projectId, { ...temp });
      Toast.success('Saved');
    } catch (error) {
      Toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const changed = useMemo(() => {
    return (
      !!origin.current &&
      !!value &&
      !equal(
        { ...origin.current },
        {
          ...value,
        }
      )
    );
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
        cancelText: t('cancel'),
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
    <Box overflow="auto" {...boxProps}>
      {onClose && !isMobile && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            display: 'flex',
            flexDirection: 'row-reverse',
            bgcolor: '#fff',
            zIndex: 10000,
          }}>
          <Button onClick={onClose} sx={{ minWidth: 32, minHeight: 32, mt: 1, mx: 1 }}>
            <CloseRounded />
          </Button>
        </Box>
      )}

      <SettingsContainer sx={{ px: 2, width: isMobile ? '100%' : '400px' }} className="setting-container">
        <Tabs
          centered
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 32,
            [`.${tabClasses.root}`]: {
              py: 1,
              px: 1,
              minHeight: 32,
              minWidth: 32,
              borderRadius: 1,
            },
            bgcolor: '#fff',
            py: 1,
            zIndex: 10000,
            position: 'sticky',
            top: isMobile ? 0 : 34,
            paddingTop: 0,
          }}
          onChange={(_event: React.SyntheticEvent, newValue: string) => {
            setCurrentTabIndex(newValue);
          }}
          value={currentTabIndex}>
          {tabListInfo.list.map((x) => {
            return <Tab disableRipple label={t(`projectSetting.tabs.${x}`)} value={x} key={x} sx={{ px: 0 }} />;
          })}
        </Tabs>
        <Box>
          {currentTabIndex === 'basic' && (
            <Form onSubmit={(e) => e.preventDefault()}>
              <Stack gap={2} mt={2}>
                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    {t('avatar')}
                  </Typography>
                  <Avatar value={value.icon ?? ''} onChange={(d: any) => set('icon', d)} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    {t('projectSetting.name')}
                  </Typography>

                  <TextField
                    label={t('projectSetting.name')}
                    sx={{ width: 1 }}
                    value={config?.name ?? ''}
                    onChange={(e) => {
                      setConfig((config) => {
                        config.name = e.target.value;
                      });
                    }}
                    InputProps={{ readOnly }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    {t('projectSetting.description')}
                  </Typography>
                  <TextField
                    label={t('projectSetting.description')}
                    multiline
                    rows={5}
                    sx={{ width: 1 }}
                    value={config?.description ?? ''}
                    onChange={(e) => {
                      setConfig((config) => {
                        config.description = e.target.value;
                      });
                    }}
                    InputProps={{ readOnly }}
                  />
                </Box>
                <Box>
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
              </Stack>
            </Form>
          )}

          {currentTabIndex === 'modelInfo' && (
            <Box mt={2}>
              <Stack gap={2}>
                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    {t('model')}
                  </Typography>

                  <ModelSelectField
                    hiddenLabel
                    fullWidth
                    value={config?.model?.model || defaultTextModel}
                    onChange={(e) => {
                      setConfig((config) => {
                        config.model = {
                          ...config.model,
                          model: e.target.value,
                        };
                      });
                    }}
                    InputProps={{ readOnly }}
                    sx={{ width: 1 }}
                  />
                </Box>

                {model && (
                  <Stack gap={1} py={1}>
                    <Box className="prefer-inline">
                      <Box>
                        <Tooltip
                          title={t('temperatureTip')}
                          placement="top"
                          disableInteractive
                          enterTouchDelay={0}
                          leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
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
                          value={config?.model?.temperature ?? model.temperatureDefault}
                          onChange={(_, v) => {
                            setConfig((config) => {
                              config.model = {
                                ...config.model,
                                temperature: v,
                              };
                            });
                          }}
                        />
                      </Box>
                    </Box>

                    <Box className="prefer-inline">
                      <Box>
                        <Tooltip
                          title={t('topPTip')}
                          placement="top"
                          disableInteractive
                          enterTouchDelay={0}
                          leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
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
                          value={config?.model?.topP ?? model.topPDefault}
                          onChange={(_, v) => {
                            setConfig((config) => {
                              config.model = {
                                ...config.model,
                                topP: v,
                              };
                            });
                          }}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                    </Box>

                    <Box className="prefer-inline">
                      <Box>
                        <Tooltip
                          title={t('presencePenaltyTip')}
                          placement="top"
                          disableInteractive
                          enterTouchDelay={0}
                          leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
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
                          value={config?.model?.presencePenalty ?? model.presencePenaltyDefault}
                          onChange={(_, v) => {
                            set('presencePenalty', v);
                            setConfig((config) => {
                              config.model = {
                                ...config.model,
                                presencePenalty: v,
                              };
                            });
                          }}
                        />
                      </Box>
                    </Box>

                    <Box className="prefer-inline">
                      <Box>
                        <Tooltip
                          title={t('frequencyPenaltyTip')}
                          placement="top"
                          disableInteractive
                          enterTouchDelay={0}
                          leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
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
                          value={config?.model?.frequencyPenalty ?? model.frequencyPenaltyDefault}
                          onChange={(_, v) => {
                            setConfig((config) => {
                              config.model = {
                                ...config.model,
                                frequencyPenalty: v,
                              };
                            });
                          }}
                        />
                      </Box>
                    </Box>

                    <Box className="prefer-inline">
                      <Box>
                        <Tooltip
                          title={t('maxTokensTip')}
                          placement="top"
                          disableInteractive
                          enterTouchDelay={0}
                          leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
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
                          value={config?.model?.maxTokens ?? model.maxTokensDefault}
                          onChange={(_, v) => {
                            setConfig((config) => {
                              config.model = {
                                ...config.model,
                                maxTokens: v,
                              };
                            });
                          }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                )}
                <Box>
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
              </Stack>
            </Box>
          )}

          {currentTabIndex === 'git' && (
            <Box overflow="auto">
              <Form>
                <Stack gap={2} mt={2}>
                  <Stack gap={2}>
                    <Box>
                      <Box>
                        <Typography variant="subtitle2" mb={0.5}>
                          {t('Git Version')}
                        </Typography>
                      </Box>

                      <FormControl className="version" sx={{ width: 1 }}>
                        <RadioGroup
                          value={value.gitType ?? 'default'}
                          onChange={(e) => !readOnly && set('gitType', e.target.value)}>
                          {versions.map((version) => {
                            return (
                              <FormControlLabel
                                key={version.value}
                                sx={{ mb: 1, mr: 0, ':last-child': { m: 0 }, alignItems: 'flex-start' }}
                                value={version.value}
                                control={<Radio sx={{ ml: -0.5 }} />}
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

                    <Box>
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
                  </Stack>
                  <RemoteRepoSetting projectId={projectId} />
                </Stack>
              </Form>
            </Box>
          )}

          {currentTabIndex === 'didSpaces' && (
            <Box mt={2}>
              <Form>
                <DidSpacesSetting projectId={projectId} />
              </Form>
            </Box>
          )}

          {currentTabIndex === 'appearance' && (
            <Box mt={2}>
              <AppearanceSetting
                setConfig={setConfig}
                onSubmit={onSubmit}
                readOnly={readOnly}
                submitLoading={submitLoading}
                config={config}
              />
            </Box>
          )}
        </Box>
      </SettingsContainer>
      {dialog}
    </Box>
  );
}

const SettingsContainer = styled(Box)`
  .prefer-inline {
    display: flex;
    align-items: center;

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

const Form = styled('form')``;
