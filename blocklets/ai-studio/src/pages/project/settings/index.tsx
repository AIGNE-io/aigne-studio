import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { InfoOutlined } from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
  styled,
} from '@mui/material';
import { useReactive, useRequest } from 'ahooks';
import { isNil, pick } from 'lodash';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { UpdateProjectInput } from '../../../../api/src/routes/project';
import Loading from '../../../components/loading';
import Avatar from '../../../components/project-settings/avatar';
import { SliderNumberField } from '../../../components/template-form/template-settings';
import UploaderProvider from '../../../contexts/uploader';
import { getErrorMessage } from '../../../libs/api';
import * as api from '../../../libs/project';

const MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k-0613'];

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

  const value = useReactive<UpdateProjectInput>(init);
  const [submitLoading, setLoading] = useState(false);

  const { error, loading } = useRequest(
    async () => {
      const res = await api.getProject(projectId);
      if (res) {
        const merge = pick({ ...init, ...res }, [
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

        // @ts-ignore
        Object.keys(merge).forEach((t) => (value[t] = merge[t]));
      }

      return res;
    },
    [projectId] as any
  );

  const versions = [
    {
      value: 'simple',
      title: t('setting.gitType.simple.title'),
      subTitle: t('setting.gitType.simple.subTitle'),
    },
    {
      value: 'default',
      title: t('setting.gitType.default.title'),
      subTitle: t('setting.gitType.default.subTitle'),
    },
  ];

  const onSubmit = async () => {
    const temp = JSON.parse(JSON.stringify(value));

    Object.keys(temp).forEach((t: string) => {
      if (isNil(temp[t])) {
        delete temp[t];
      }
    });

    setLoading(true);

    try {
      await api.updateProject(projectId, temp);
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

  if (loading) {
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
            <Box component="h3">{t('setting.baseInfo')}</Box>

            <Box display="flex" alignItems="center" p={1}>
              <Avatar value={value.icon ?? ''} onChange={(d: any) => (value.icon = d)} />

              <Stack spacing={1} flex={1} ml={4}>
                <TextField
                  size="small"
                  label={t('setting.name')}
                  sx={{ flex: 1 }}
                  value={value.name ?? ''}
                  onChange={(e) => (value.name = e.target.value)}
                />

                <TextField
                  size="small"
                  label={t('setting.description')}
                  multiline
                  rows={4}
                  sx={{ width: 1 }}
                  value={value.description ?? ''}
                  onChange={(e) => (value.description = e.target.value)}
                />
              </Stack>
            </Box>
          </Box>

          <Box my={2}>
            <Box component="h3">{t('setting.defaultModel')}</Box>

            <Box>
              <Box className="prefer-inline">
                <Box>
                  <FormLabel>{t('model')}</FormLabel>
                </Box>

                <Box>
                  <Select
                    variant="filled"
                    fullWidth
                    value={value.model ?? ''}
                    onChange={(e) => (value.model = e.target.value)}
                    disableUnderline>
                    {MODELS.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
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
                    onChange={(_, v) => (value.temperature = v)}
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
                    onChange={(_, v) => (value.topP = v)}
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
                    onChange={(_, v) => (value.presencePenalty = v)}
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
                    onChange={(_, v) => (value.frequencyPenalty = v)}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box my={2}>
            <Box component="h3">{t('setting.gitType.title')}</Box>

            <Box>
              <FormControl className="version">
                <RadioGroup value={value.gitType ?? 'default'} onChange={(e) => (value.gitType = e.target.value)}>
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

          <Box display="flex" justifyContent="flex-end">
            <Button size="small" variant="contained" onClick={onSubmit} disabled={submitLoading}>
              {t('save')}
            </Button>
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
