import MdViewer from '@app/components/md-viewer';
import { PremiumFeatureTag } from '@app/components/multi-tenant-restriction/premium-feature-tag';
import { showPlanUpgrade } from '@app/components/multi-tenant-restriction/state';
import { useCurrentProject } from '@app/contexts/project';
import UploaderProvider from '@app/contexts/uploader';
import { getDefaultBranch, useCurrentGitStore } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { defaultTextModel, getSupportedModels } from '@blocklet/ai-runtime/common';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { CloseRounded, SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  BoxProps,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Tabs,
  TextField,
  Theme,
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
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { useAsync } from 'react-use';

import { UpdateProjectInput } from '../../../../api/src/routes/project';
import Loading from '../../../components/loading';
import Avatar from '../../../components/project-settings/avatar';
import { useReadOnly, useSessionContext } from '../../../contexts/session';
import { getErrorMessage } from '../../../libs/api';
import { getProjectIconUrl, uploadAsset } from '../../../libs/project';
import useDialog from '../../../utils/use-dialog';
import { useProjectState } from '../state';
import { useProjectStore } from '../yjs-state';
import AppearanceSetting from './appearance-setting';
import DidSpacesSetting from './did-spaces-setting';
import IntegrationSetting from './integration-setting';
import ModelSettings from './model-setting';
import Readme from './readme';
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
  const { projectId, projectRef } = useCurrentProject();

  const readOnly = useReadOnly({ ref: getDefaultBranch() });
  const { dialog, showDialog } = useDialog();
  const [submitLoading, setLoading] = useState(false);
  const [value, setValue] = useState<UpdateProjectInput & { icon?: string }>(init);
  const isSubmit = useRef(false);
  const origin = useRef<UpdateProjectInput>();
  const { session } = useSessionContext();
  const getCurrentBranch = useCurrentGitStore((i) => i.getCurrentBranch);

  const tabListInfo: { list: string[] } = {
    list: [
      'basic',
      'modelInfo',
      'appearance',
      'git',
      !isEmpty(session?.user?.didSpace?.endpoint) ? 'didSpaces' : '',
      'integrations',
    ].filter((x) => x),
  };
  const [currentTabIndex, setCurrentTabIndex] = useState<string | undefined>(tabListInfo.list[0]);

  const { value: supportedModels, loading: getSupportedModelsLoading } = useAsync(() => getSupportedModels(), []);
  const { projectSetting } = useProjectStore(projectId, projectRef);

  const setProjectSetting = (update: (v: typeof projectSetting) => void) => {
    const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
    doc.transact(() => {
      update(projectSetting);
    });
  };

  const model = useMemo(
    () =>
      supportedModels?.find((i) => i.model === projectSetting?.model) ??
      supportedModels?.find((i) => i.model === defaultTextModel),
    [projectSetting?.model, supportedModels]
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
      merge.icon = getProjectIconUrl(projectId, {
        original: true,
        updatedAt: projectSetting?.iconVersion,
        working: true,
        projectRef,
      });

      origin.current = merge;
      setValue(merge);
    }
  }, [getCurrentBranch, project, projectId, projectSetting?.iconVersion]);

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

  const isMultiTenant = window.blocklet?.tenantMode === 'multiple';
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
          <Button data-testid="settings-close-btn" onClick={onClose} sx={{ minWidth: 32, minHeight: 32, mt: 1, mx: 1 }}>
            <CloseRounded />
          </Button>
        </Box>
      )}

      <SettingsContainer px={2} className="setting-container">
        <Tabs
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
                  <Avatar
                    value={value.icon ?? ''}
                    onChange={async (source) => {
                      try {
                        const { hash } = await uploadAsset({ projectId, ref: projectRef, source, type: 'logo' });
                        setProjectSetting((config) => {
                          config.iconVersion = hash;
                        });
                      } catch (error) {
                        Toast.error(error.message);
                        throw error;
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" mb={0.5}>
                    {t('projectSetting.name')}
                  </Typography>

                  <TextField
                    label={t('projectSetting.name')}
                    sx={{ width: 1 }}
                    value={projectSetting?.name ?? ''}
                    onChange={(e) => {
                      setProjectSetting((config) => {
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
                    value={projectSetting?.description ?? ''}
                    onChange={(e) => {
                      setProjectSetting((config) => {
                        config.description = e.target.value;
                      });
                    }}
                    InputProps={{ readOnly }}
                  />
                </Box>

                <Box
                  onClick={() => {
                    showDialog({
                      maxWidth: 'md',
                      fullWidth: true,
                      title: t('projectSetting.readme'),
                      content: (
                        <UploaderProvider>
                          <Readme projectId={projectId} projectRef={projectRef} />
                        </UploaderProvider>
                      ),
                      okText: t('close'),
                    });
                  }}>
                  <Typography variant="subtitle2" mb={0.5}>
                    {t('projectSetting.readme')}
                  </Typography>

                  {projectSetting?.readme ? (
                    <MdViewer
                      content={projectSetting?.readme}
                      sx={{
                        cursor: 'pointer',
                        maxHeight: 128,
                        height: 1,
                        width: 1,
                        overflowX: 'hidden',
                        overflow: 'overlay',
                        background: 'rgba(0, 0, 0, 0.03)',

                        img: {
                          width: '50%',
                        },

                        h1: { margin: 0 },
                        h2: { margin: 0 },
                        h3: { margin: 0 },
                        h4: { margin: 0 },
                        h5: { margin: 0 },
                        h6: { margin: 0 },
                      }}
                    />
                  ) : (
                    <TextField
                      sx={{ width: 1, cursor: 'pointer' }}
                      value={projectSetting?.readme ?? ''}
                      multiline
                      rows={5}
                      hiddenLabel
                      InputProps={{ readOnly: true }}
                    />
                  )}
                </Box>
              </Stack>
            </Form>
          )}

          {currentTabIndex === 'modelInfo' && (
            <Box mt={2}>
              <ModelSettings projectId={projectId} projectRef={projectRef} model={model} />
            </Box>
          )}

          {currentTabIndex === 'appearance' && (
            <Box mt={2}>
              <AppearanceSetting />
            </Box>
          )}

          {currentTabIndex === 'git' && (
            <Box overflow="auto">
              <Form>
                <Stack gap={2} mt={2}>
                  <Stack gap={2}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" mb={0}>
                          {t('Git Version')}
                        </Typography>
                        {isMultiTenant && <PremiumFeatureTag onClick={() => showPlanUpgrade('git')} />}
                      </Box>

                      <FormControl disabled={isMultiTenant} className="version" sx={{ width: 1 }}>
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
                        disabled={readOnly || isMultiTenant}
                        variant="contained"
                        loadingPosition="start"
                        loading={submitLoading}
                        startIcon={<SaveRounded />}
                        onClick={onSubmit}>
                        {t('save')}
                      </LoadingButton>
                    </Box>
                  </Stack>
                  <RemoteRepoSetting projectId={projectId} gitRef={projectRef} />
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

          {currentTabIndex === 'integrations' && (
            <Box mt={2}>
              <IntegrationSetting />
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
