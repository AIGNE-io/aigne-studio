import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ExecuteBlock, ExecuteBlockYjs, Role, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import getOpenApiTextFromI18n from '@blocklet/dataset-sdk/util/get-open-api-i18n-text';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import TrashIcon from '@iconify-icons/tabler/trash';
import { InfoOutlined as MuiInfoOutlined } from '@mui/icons-material';
import {
  Box,
  Checkbox,
  CircularProgress,
  ClickAwayListener,
  Divider,
  Grow,
  IconButton,
  ListItemText,
  MenuItem,
  Paper,
  Popper,
  Stack,
  StackProps,
  Tooltip,
  Typography,
} from '@mui/material';
import { isNil, sortBy } from 'lodash';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo } from 'react';

import Knowledge from '../../../api/src/store/models/dataset/dataset';
import { useProjectStore } from '../../pages/project/yjs-state';
import IndicatorTextField from '../awareness/indicator-text-field';
import PromptEditorField from './prompt-editor-field';

export default function ExecuteDatasetBlockForm({
  projectId,
  gitRef,
  assistant,
  value,
  readOnly,
  path,
  compareAssistant,
  isRemoteCompare,
  openApis,
  ...props
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  value: ExecuteBlockYjs;
  path: (string | number)[];
  readOnly?: boolean;
  compareAssistant?: AssistantYjs;
  isRemoteCompare?: boolean;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
} & StackProps) {
  // const { t } = useLocaleContext();

  // const { getDiffBackground } = useAssistantCompare({
  //   value: assistant,
  //   compareValue: compareAssistant,
  //   readOnly,
  //   isRemoteCompare,
  // });

  const tools = value.tools && sortBy(Object.values(value.tools), (i) => i.index);

  return (
    <Stack {...props} sx={{ border: 2, borderColor: 'warning.main', borderRadius: 1, ...props.sx }}>
      {tools?.map(({ data: tool }) => (
        <ToolItemView
          key={tool.id}
          assistant={assistant}
          projectId={projectId}
          projectRef={gitRef}
          tool={tool}
          readOnly={readOnly}
          openApis={openApis}
          datasets={[]}
          gitRef={gitRef}
          value={value}
        />
      ))}
    </Stack>
  );
}

function ToolItemView({
  projectId,
  projectRef,
  tool,
  gitRef,
  readOnly,
  openApis,
  datasets,
  assistant,
  value,
}: {
  assistant: AssistantYjs;
  projectId: string;
  projectRef: string;
  gitRef: string;
  tool: Tool;
  readOnly?: boolean;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  datasets: (Knowledge['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  value: ExecuteBlockYjs;
} & StackProps) {
  const { t, locale } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);
  const popperState = usePopupState({ variant: 'popper', popupId: 'settings' });

  const f = store.files[tool.id];
  const file = f && isAssistant(f) ? f : undefined;

  const dataset = datasets.find((x) => x.id === tool.id);
  const api = openApis.find((i) => i.id === tool.id);

  const target = file ?? dataset ?? api;

  const parameters = useMemo(() => {
    return getAllParameters(target as DatasetObject);
  }, [target]);

  const assistantParameters = new Set([
    ...Object.values(assistant.parameters ?? {}).map((i) => i.data.key),
    ...(assistant.type === 'prompt'
      ? Object.values(assistant.prompts ?? {})
          .map((i) => (i.data.type === 'executeBlock' ? i.data.data.variable : undefined))
          .filter(Boolean)
      : []),
  ]);

  if (!target) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          minHeight: 100,
          alignItems: "center",
          width: 1
        }}>
        <CircularProgress size="20px" />
      </Box>
    );
  }

  const prefixOrSuffix = value.role !== 'none' && value.formatResultType !== 'asHistory' && assistant.type === 'prompt';
  return (
    <>
      <Stack
        sx={{
          px: 1.5,
          py: 1,
          gap: 1.25
        }}>
        <Box className="between">
          <Typography noWrap variant="subtitle4">
            {getOpenApiTextFromI18n(target || {}, 'summary', locale)}
          </Typography>

          <>
            <IconButton {...bindTrigger(popperState)}>
              <Box
                component={Icon}
                icon={PlusIcon}
                sx={{
                  color: "#3B82F6",
                  fontSize: 16
                }} />
            </IconButton>
            <Popper {...bindPopper(popperState)} sx={{ zIndex: 1101 }} transition placement="bottom-end">
              {({ TransitionProps }) => (
                <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
                  <Paper sx={{ border: '1px solid #ddd', maxWidth: 450, maxHeight: '80vh', overflow: 'auto', mt: 1 }}>
                    <ClickAwayListener
                      onClickAway={(e) => (e.target as HTMLElement)?.localName !== 'body' && popperState.close()}>
                      <Box>
                        {isNil(value.variable) && (
                          <MenuItem onClick={() => (value.variable = '')}>
                            <ListItemText primary={t('outputName')} />
                          </MenuItem>
                        )}

                        {isNil(value.role) && assistant.type === 'prompt' && (
                          <MenuItem onClick={() => (value.role = 'system')}>
                            <ListItemText primary={t('outputRole')} />
                          </MenuItem>
                        )}

                        {isNil(value.formatResultType) && (
                          <MenuItem onClick={() => (value.formatResultType = 'none')}>
                            <ListItemText primary={t('formatResult')} />
                          </MenuItem>
                        )}

                        {isNil(value.prefix) && prefixOrSuffix && (
                          <MenuItem onClick={() => (value.prefix = '')}>
                            <ListItemText primary={t('outputPrefix')} />
                          </MenuItem>
                        )}

                        {isNil(value.suffix) && prefixOrSuffix && (
                          <MenuItem onClick={() => (value.suffix = '')}>
                            <ListItemText primary={t('outputSuffix')} />
                          </MenuItem>
                        )}

                        {isNil(value.respondAs) && (
                          <MenuItem onClick={() => (value.respondAs = 'none')}>
                            <ListItemText primary={t('respondAs')} />
                          </MenuItem>
                        )}
                      </Box>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>
          </>
        </Box>

        {!isNil(value.variable) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1
              }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputName')}
              </Typography>
              <Tooltip title={t('outputNameTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1
              }}>
              <Box sx={{
                flex: 1
              }}>
                <IndicatorTextField
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, value.variable ?? '']}
                  TextFiledProps={{
                    hiddenLabel: true,
                    size: 'small',
                    inputProps: {
                      maxLength: 15,
                    },
                    InputProps: {
                      placeholder: t('executeBlockName'),
                      readOnly,
                    },
                    value: value.variable ?? '',
                    onChange: (e) => (value.variable = e.target.value),
                  }}
                  boxProps={{
                    sx: {
                      width: 1,

                      '.MuiTextField-root': {
                        width: 1,

                        '.MuiInputBase-root': {
                          px: 1,
                          py: 0.5,

                          input: {
                            px: 0,
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>

              <IconButton onClick={() => (value.variable = undefined)}>
                <Box
                  component={Icon}
                  icon={TrashIcon}
                  sx={{
                    color: "warning.main",
                    fontSize: 18
                  }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.prefix) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between"
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1
              }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputPrefix')}
              </Typography>
              <Tooltip title={t('outputPrefixTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1
              }}>
              <Box sx={{
                flex: 1
              }}>
                <PromptEditorField
                  readOnly={readOnly}
                  projectId={projectId}
                  gitRef={gitRef}
                  ContentProps={{
                    sx: {
                      px: 1,
                      py: 0.5,
                    },
                  }}
                  placeholder="Your output prefix"
                  path={[value.id, 'prefix']}
                  assistant={assistant}
                  value={value.prefix}
                  onChange={(prefix) => (value.prefix = prefix)}
                />
              </Box>

              <IconButton onClick={() => (value.prefix = undefined)}>
                <Box
                  component={Icon}
                  icon={TrashIcon}
                  sx={{
                    color: "warning.main",
                    fontSize: 18
                  }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.suffix) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between"
            }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1
              }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputSuffix')}
              </Typography>
              <Tooltip title={t('outputSuffixTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1
              }}>
              <Box sx={{
                flex: 1
              }}>
                <PromptEditorField
                  readOnly={readOnly}
                  projectId={projectId}
                  gitRef={gitRef}
                  ContentProps={{
                    sx: {
                      px: 1,
                      py: 0.5,
                    },
                  }}
                  placeholder="Your output suffix"
                  path={[value.id, 'suffix']}
                  assistant={assistant}
                  value={value.suffix}
                  onChange={(suffix) => (value.suffix = suffix)}
                />
              </Box>

              <IconButton onClick={() => (value.suffix = undefined)}>
                <Box
                  component={Icon}
                  icon={TrashIcon}
                  sx={{
                    color: "warning.main",
                    fontSize: 18
                  }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.role) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between"
            }}>
            <Box
              sx={{
                display: "flex",
                flex: 1
              }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputRole')}
              </Typography>
              <Tooltip title={t('outputRoleTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1
              }}>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end"
                }}>
                <IndicatorTextField
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, value.role ?? 'system']}
                  TextFiledProps={{
                    size: 'small',
                    select: true,
                    hiddenLabel: true,
                    SelectProps: {
                      autoWidth: true,
                    },
                    value: value.role || 'system',
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      (value.role = e.target.value as Role),
                    children: [
                      <MenuItem key="system" value="system">
                        {t('systemPrompt')}
                      </MenuItem>,
                      <MenuItem key="user" value="user">
                        {t('userPrompt')}
                      </MenuItem>,
                      <MenuItem key="assistant" value="assistant">
                        {t('assistantPrompt')}
                      </MenuItem>,
                      <MenuItem key="none" value="none">
                        {t('ignoreOutput')}
                      </MenuItem>,
                    ],
                  }}
                />
              </Box>

              <IconButton onClick={() => (value.role = undefined)}>
                <Box
                  component={Icon}
                  icon={TrashIcon}
                  sx={{
                    color: "warning.main",
                    fontSize: 18
                  }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.formatResultType) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between"
            }}>
            <Typography
              variant="subtitle2"
              sx={{
                flex: 1,
                whiteSpace: 'nowrap',
                mr: 0.5,
                mb: 0,
                fontWeight: 400
              }}>
              {t('formatResult')}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1
              }}>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end"
                }}>
                <IndicatorTextField
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, value.formatResultType ?? 'none']}
                  TextFiledProps={{
                    size: 'small',
                    select: true,
                    hiddenLabel: true,
                    SelectProps: {
                      autoWidth: true,
                    },
                    value: value.formatResultType || 'none',
                    onChange: (e) => (value.formatResultType = e.target.value as any),
                    children: [
                      <MenuItem key="none" value="none">
                        {t('stayAsIs')}
                      </MenuItem>,
                      <MenuItem key="asHistory" value="asHistory">
                        {t('asHistory')}
                      </MenuItem>,
                    ],
                  }}
                />
              </Box>

              <IconButton onClick={() => (value.formatResultType = undefined)}>
                <Box
                  component={Icon}
                  icon={TrashIcon}
                  sx={{
                    color: "warning.main",
                    fontSize: 18
                  }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.respondAs) && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
            <Box sx={{
              flex: 1
            }}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('respondAs')}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                gap: 1
              }}>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "flex-end"
                }}>
                <IndicatorTextField
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, value.respondAs ?? 'none']}
                  TextFiledProps={{
                    size: 'small',
                    select: true,
                    hiddenLabel: true,
                    SelectProps: {
                      autoWidth: true,
                    },
                    value: value.respondAs || 'none',
                    onChange: (e) => (value.respondAs = e.target.value as any),
                    children: [
                      <MenuItem key="none" value="none" sx={{ color: 'text.secondary' }}>
                        {t('none')}
                      </MenuItem>,
                      <MenuItem key="message" value="message">
                        {t('respondAsMessage')}
                      </MenuItem>,
                      <MenuItem key="systemMessage" value="systemMessage">
                        {t('respondAsSystemMessage')}
                      </MenuItem>,
                    ],
                  }}
                />
              </Box>

              <IconButton onClick={() => (value.respondAs = undefined)}>
                <Box
                  component={Icon}
                  icon={TrashIcon}
                  sx={{
                    color: "warning.main",
                    fontSize: 18
                  }} />
              </IconButton>
            </Box>
          </Box>
        )}
      </Stack>
      <Divider sx={{ borderColor: '#DDD6FE' }} />
      <Stack
        sx={{
          m: 1.5,
          gap: 1.5,
          mt: 1.5
        }}>
        {(parameters || [])?.map((parameter: any) => {
          if (!parameter) return null;
          if (parameter['x-hide']) return null;

          tool.parameters ??= {};
          const value = tool.parameters[parameter.name];

          const render = () => {
            if (parameter['x-parameter-type'] === 'boolean') {
              return (
                <Box>
                  <Checkbox
                    checked={Boolean(value || '')}
                    onChange={(e: any) => {
                      if (tool.parameters) tool.parameters[parameter.name] = e.target.checked;
                    }}
                  />
                </Box>
              );
            }

            return (
              <PromptEditorField
                placeholder={assistantParameters.has(parameter.key) ? `{{ ${parameter.name} }}` : undefined}
                value={value || ''}
                projectId={projectId}
                gitRef={gitRef}
                assistant={assistant}
                path={[assistant.id, parameter.name]}
                onChange={(value) => {
                  if (tool.parameters) tool.parameters[parameter.name] = value;
                }}
              />
            );
          };

          return (
            <Stack key={parameter.name}>
              <Typography variant="subtitle2" sx={{
                mb: 0.5
              }}>
                {getOpenApiTextFromI18n(parameter, 'description', locale) ||
                  getOpenApiTextFromI18n(parameter, 'name', locale)}
              </Typography>
              {render()}
            </Stack>
          );
        })}
      </Stack>
    </>
  );
}
