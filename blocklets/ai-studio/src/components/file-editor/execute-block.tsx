import { textCompletions } from '@app/libs/ai';
import Star from '@app/pages/project/icons/star';
import Translate from '@app/pages/project/icons/translate';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ConfigFileYjs,
  CronFileYjs,
  ExecuteBlock,
  ExecuteBlockYjs,
  FileTypeYjs,
  MemoryFileYjs,
  ProjectSettings,
  Role,
  Tool,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import getOpenApiTextFromI18n from '@blocklet/dataset-sdk/util/get-open-api-i18n-text';
import { Icon } from '@iconify-icon/react';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import PlusIcon from '@iconify-icons/tabler/plus';
import TrashIcon from '@iconify-icons/tabler/trash';
import { InfoOutlined as MuiInfoOutlined } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grow,
  IconButton,
  ListItemText,
  MenuItem,
  Paper,
  Popper,
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
  createFilterOptions,
} from '@mui/material';
import { GridExpandMoreIcon } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import axios from 'axios';
import { cloneDeep, isNil, sortBy } from 'lodash';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAssistantCompare } from 'src/pages/project/state';
import { joinURL } from 'ufo';

import Knowledge from '../../../api/src/store/models/dataset/dataset';
import { getAPIList, getKnowledgeList } from '../../libs/knowledge';
import InfoOutlined from '../../pages/project/icons/question';
import Trash from '../../pages/project/icons/trash';
import { PROMPTS_FOLDER_NAME, useCreateFile, useProjectStore } from '../../pages/project/yjs-state';
import IndicatorTextField from '../awareness/indicator-text-field';
import LoadingIconButton from '../loading/loading-icon-button';
import { ModelPopper, ModelSetting } from '../modal-settings';
import ExecuteDatasetBlockForm from './execute-dataset-block';
import PromptEditorField from './prompt-editor-field';

export const FROM_DATASET = 'blockletAPI';
export const FROM_KNOWLEDGE = 'knowledge';

export default function ExecuteBlockForm({
  projectId,
  gitRef,
  assistant,
  value,
  readOnly = undefined,
  path,
  compareAssistant = undefined,
  isRemoteCompare = undefined,
  from = undefined,
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
  from?: string;
} & StackProps) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const toolForm = useRef<ToolDialogImperative>(null);
  const selectedTool = useRef<string>(undefined);

  const { store } = useProjectStore(projectId, gitRef);
  const popperState = usePopupState({ variant: 'popper', popupId: 'settings' });

  const { data: openApis = [] } = useRequest(() => getAPIList());
  const { data: datasets = [] } = useRequest(() => getKnowledgeList({ projectId }));

  const { getDiffBackground } = useAssistantCompare({
    value: assistant,
    compareValue: compareAssistant,
    readOnly,
    isRemoteCompare,
  });

  const tools = value.tools && sortBy(Object.values(value.tools), (i) => i.index);

  if (value.type) {
    return (
      <ExecuteDatasetBlockForm
        assistant={assistant}
        projectId={projectId}
        gitRef={gitRef}
        path={path}
        value={value}
        readOnly={readOnly}
        compareAssistant={compareAssistant}
        isRemoteCompare={isRemoteCompare}
        openApis={openApis}
        {...props}
        sx={{ borderColor: '#7C3AED' }}
      />
    );
  }

  const prefixOrSuffix = value.role !== 'none' && value.formatResultType !== 'asHistory' && assistant.type === 'prompt';
  return (
    <Stack {...props} sx={{ border: 2, borderRadius: 1, ...props.sx, borderColor: '#7C3AED' }}>
      <Stack px={1.5} py={1} gap={1.25}>
        <Box className="between">
          <Typography noWrap variant="subtitle4">
            {value.selectType === 'selectByPrompt' ? t('toolCalling') : t('multipleCall')}
          </Typography>

          <>
            <IconButton {...bindTrigger(popperState)}>
              <Box component={Icon} icon={PlusIcon} color="#3B82F6" fontSize={16} />
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

        {from === 'prepare-execute-list' && (
          <Box display="flex" alignItems="baseline" justifyContent="space-between">
            <Box display="flex" flex={1}>
              <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('executeMethods')}</Typography>
              <Tooltip title={t('executeMethodsTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>

            <Box>
              <IndicatorTextField
                projectId={projectId}
                gitRef={gitRef}
                path={[value.id, value.selectType ?? 'all']}
                TextFiledProps={{
                  size: 'small',
                  select: true,
                  hiddenLabel: true,
                  SelectProps: {
                    autoWidth: true,
                  },
                  value: value.selectType || 'all',
                  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    (value.selectType = e.target.value as any),
                  children: [
                    <MenuItem key="all" value="all">
                      {t('allTools')}
                    </MenuItem>,
                    <MenuItem key="selectByPrompt" value="selectByPrompt">
                      {t('selectPrompt')}
                    </MenuItem>,
                  ],
                }}
              />
            </Box>
          </Box>
        )}

        {value.selectType === 'selectByPrompt' && (
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" flex={1}>
              <Typography
                variant="subtitle2"
                sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}
                lineHeight={1}>
                {t('prompt')}
              </Typography>

              <ModelPopper>
                <ModelSetting
                  files={store.files}
                  value={value}
                  readOnly={readOnly}
                  projectId={projectId}
                  gitRef={gitRef}
                />
              </ModelPopper>
            </Box>
            <Box flex={1} display="flex" alignItems="center" gap={1}>
              <Box flex={1}>
                <PromptEditorField
                  readOnly={readOnly}
                  projectId={projectId}
                  gitRef={gitRef}
                  ContentProps={{ sx: { px: 1, py: 0.5 } }}
                  placeholder="Your select prompt"
                  path={path.concat('selectByPrompt')}
                  assistant={assistant}
                  value={value.selectByPrompt}
                  onChange={(prompt) => (value.selectByPrompt = prompt)}
                />
              </Box>
            </Box>
          </Box>
        )}

        {!isNil(value.variable) && (
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" flex={1}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputName')}
              </Typography>
              <Tooltip title={t('outputNameTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>

            <Box display="flex" alignItems="center" flex={1} gap={1}>
              <Box flex={1}>
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
                <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={18} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.role) && (
          <Box display="flex" alignItems="baseline" justifyContent="space-between">
            <Box display="flex" flex={1}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputRole')}
              </Typography>
              <Tooltip title={t('outputRoleTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>

            <Box display="flex" alignItems="center" flex={1} gap={1}>
              <Box flex={1} display="flex" justifyContent="flex-end">
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
                <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={18} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.formatResultType) && (
          <Box display="flex" alignItems="baseline" justifyContent="space-between">
            <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }} flex={1}>
              {t('formatResult')}
            </Typography>

            <Box display="flex" alignItems="center" flex={1} gap={1}>
              <Box flex={1} display="flex" justifyContent="flex-end">
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
                <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={18} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.prefix) && (
          <Box display="flex" alignItems="baseline" justifyContent="space-between">
            <Box display="flex" flex={1}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputPrefix')}
              </Typography>
              <Tooltip title={t('outputPrefixTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>
            <Box display="flex" alignItems="center" flex={1} gap={1}>
              <Box flex={1}>
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
                <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={18} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.suffix) && (
          <Box display="flex" alignItems="baseline" justifyContent="space-between">
            <Box display="flex" flex={1}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('outputSuffix')}
              </Typography>
              <Tooltip title={t('outputSuffixTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>
            <Box display="flex" alignItems="center" flex={1} gap={1}>
              <Box flex={1}>
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
                <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={18} />
              </IconButton>
            </Box>
          </Box>
        )}

        {!isNil(value.respondAs) && (
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box flex={1}>
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', mr: 0.5, mb: 0, fontWeight: 400 }}>
                {t('respondAs')}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" flex={1} gap={1}>
              <Box flex={1} display="flex" justifyContent="flex-end">
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
                <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={18} />
              </IconButton>
            </Box>
          </Box>
        )}
      </Stack>

      <Divider sx={{ borderColor: '#DDD6FE' }} />

      <Accordion
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 1,
          '&::before': {
            display: 'none',
          },
        }}
        square
        disableGutters
        defaultExpanded
        elevation={0}>
        <AccordionSummary
          sx={{
            px: 0,
            minHeight: 28,
            '& .MuiAccordionSummary-content': {
              my: 0,
            },
          }}
          expandIcon={<GridExpandMoreIcon />}>
          <Typography variant="subtitle2">{t('tool')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, mt: 1.5, gap: 1.5, display: 'flex', flexDirection: 'column' }}>
          {(!tools || tools?.length === 0) && (
            <Stack alignItems="center">
              <Typography variant="subtitle1">🔨</Typography>
              {/* <Typography variant="subtitle4">{t('emptyProjectTitle')}</Typography> */}
              <Typography variant="subtitle5">{t('emptyToolPlaceholder')}</Typography>
            </Stack>
          )}

          {tools?.map(({ data: tool }) => (
            <ToolItemView
              key={tool.id}
              getDiffBackground={getDiffBackground}
              projectId={projectId}
              projectRef={gitRef}
              tool={tool}
              executeBlock={value}
              readOnly={readOnly}
              openApis={openApis}
              datasets={datasets}
              onClick={() => {
                if (readOnly) return;
                toolForm.current?.form.reset(cloneDeep(tool));
                selectedTool.current = tool.id;
                dialogState.open();
              }}
            />
          ))}

          {!readOnly && (
            <Box>
              <Button
                startIcon={<Box component={Icon} icon={PlusIcon} />}
                onClick={() => {
                  toolForm.current?.form.reset({ id: undefined, parameters: undefined });
                  dialogState.open();
                }}>
                {t('tool')}
              </Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      <ToolDialog
        executeBlock={value}
        ref={toolForm}
        projectId={projectId}
        assistant={assistant}
        gitRef={gitRef}
        DialogProps={{ ...bindDialog(dialogState) }}
        openApis={openApis.map((x) => ({ ...x, from: FROM_DATASET }))}
        datasets={datasets.map((x) => ({ ...x, from: FROM_KNOWLEDGE }))}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;

          doc.transact(() => {
            value.tools ??= {};

            const old = value.tools[tool.id];

            if (selectedTool.current) {
              delete value.tools[selectedTool.current];
              selectedTool.current = '';
            }

            value.tools[tool.id] = {
              index: old?.index ?? Math.max(-1, ...Object.values(value.tools).map((i) => i.index)) + 1,
              data: tool,
            };

            sortBy(Object.values(value.tools), 'index').forEach((tool, index) => (tool.index = index));
          });
          dialogState.close();
        }}
      />
    </Stack>
  );
}

function ToolItemView({
  getDiffBackground,
  projectId,
  projectRef,
  tool,
  executeBlock,
  readOnly = undefined,
  openApis,
  datasets,
  ...props
}: {
  executeBlock: ExecuteBlockYjs;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
  projectId: string;
  projectRef: string;
  tool: Tool;
  readOnly?: boolean;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  datasets: (Knowledge['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
} & StackProps) {
  const navigate = useNavigate();

  const { t, locale } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);

  const f = store.files[tool.id];
  const file = f && isAssistant(f) ? f : undefined;

  const dataset = datasets.find((x) => x.id === tool.id);
  const api = openApis.find((i) => i.id === tool.id);

  const target = file ?? dataset ?? api;

  if (!target) return null;

  const name = api ? getOpenApiTextFromI18n(api, 'summary', locale) || t('unnamed') : target.name;
  const description = api ? getOpenApiTextFromI18n(api, 'description', locale) : target.description;

  return (
    <Stack
      direction="row"
      {...props}
      sx={{
        background: '#F9FAFB',
        py: 1,
        px: 1.5,
        minHeight: 40,
        gap: 1,
        alignItems: 'center',
        cursor: 'pointer',
        borderRadius: 1,
        ':hover': {
          bgcolor: 'action.hover',
          '.hover-visible': {
            display: 'flex',
          },
        },
        backgroundColor: { ...getDiffBackground('prepareExecutes', `${executeBlock.id}.data.tools.${tool.id}`) },
      }}>
      <Tooltip title={t('defaultTool')}>
        <Typography
          noWrap
          maxWidth="50%"
          variant="subtitle2"
          sx={{ mb: 0 }}
          color={
            executeBlock.selectType === 'selectByPrompt' && executeBlock.defaultToolId === tool.id
              ? 'primary.main'
              : '#030712'
          }>
          {name || t('unnamed')}
        </Typography>
      </Tooltip>

      <Typography
        variant="subtitle3"
        flex={1}
        noWrap
        color={
          executeBlock.selectType === 'selectByPrompt' && executeBlock.defaultToolId === tool.id
            ? 'primary.main'
            : '#030712'
        }
        sx={{
          opacity: (theme) => theme.palette.action.disabledOpacity,
        }}>
        {description}
      </Typography>

      <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={0.5}>
        {executeBlock.selectType === 'selectByPrompt' && (
          <Tooltip title={executeBlock.defaultToolId === tool.id ? t('unsetDefaultTool') : t('setDefaultTool')}>
            <Button
              sx={{ minWidth: 24, minHeight: 24, p: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                const doc = (getYjsValue(executeBlock) as Map<any>).doc!;
                doc.transact(() => {
                  if (executeBlock.defaultToolId === tool.id) {
                    executeBlock.defaultToolId = undefined;
                  } else {
                    executeBlock.defaultToolId = tool.id;
                  }
                });
              }}>
              <Star
                sx={{ fontSize: 18, color: executeBlock.defaultToolId === tool.id ? 'primary.main' : 'text.secondary' }}
              />
            </Button>
          </Tooltip>
        )}

        {!readOnly && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              const doc = (getYjsValue(executeBlock) as Map<any>).doc!;
              doc.transact(() => {
                if (executeBlock.selectType === 'selectByPrompt') {
                  const selectTool = executeBlock.tools?.[tool.id];
                  if (selectTool) {
                    selectTool.data.onEnd = undefined;
                  }
                }
                if (executeBlock.tools) {
                  delete executeBlock.tools[tool.id];
                  sortBy(Object.values(executeBlock.tools), 'index').forEach((i, index) => (i.index = index));
                }
              });
            }}>
            <Trash sx={{ fontSize: 18, color: '#E11D48' }} />
          </Button>
        )}

        {file && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(joinURL('.', `${file.id}.yaml`));
            }}>
            <Box component={Icon} icon={ExternalLinkIcon} sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

type Option = {
  id: NonNullable<ExecuteBlock['tools']>[number]['id'];
  type:
    | Exclude<FileTypeYjs, { $base64: string } | MemoryFileYjs | ProjectSettings | ConfigFileYjs | CronFileYjs>['type']
    | string;
  name?: any;
  from?: NonNullable<ExecuteBlock['tools']>[number]['from'];
  fromText?: string;
};
const filter = createFilterOptions<Option>();

function isDatasetObject(
  option: any
): option is DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] } {
  return option && option.from === FROM_DATASET;
}

function isKnowledgeObject(
  option: any
): option is DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] } {
  return option && option.from === FROM_KNOWLEDGE;
}

type ToolDialogForm = NonNullable<ExecuteBlock['tools']>[number];

export interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}

export const ToolDialog = ({
  ref,
  openApis,
  datasets,
  executeBlock = undefined,
  assistant,
  projectId,
  gitRef,
  onSubmit,
  DialogProps = undefined,
}: {
  executeBlock?: ExecuteBlockYjs;
  projectId: string;
  gitRef: string;
  onSubmit: (value: ToolDialogForm) => any;
  DialogProps?: DialogProps;
  assistant: AssistantYjs;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  datasets: (Knowledge['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
} & {
  ref: React.RefObject<ToolDialogImperative | null>;
}) => {
  const { t, locale } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const assistantId = assistant.id;

  const form = useForm<ToolDialogForm>({ defaultValues: {} });

  useImperativeHandle(ref, () => ({ form }), [form]);

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== assistantId)
    .map((i) => ({ id: i.id, type: i.type, name: i.name, from: undefined }));

  const fileId = form.watch('id');
  const f = store.files[fileId];
  const file = f && isAssistant(f) ? f : undefined;

  const assistantParameters = new Set([
    ...Object.values(assistant.parameters ?? {}).map((i) => i.data.key),
    ...(assistant.type === 'prompt'
      ? Object.values(assistant.prompts ?? {})
          .map((i) => (i.data.type === 'executeBlock' ? i.data.data.variable : undefined))
          .filter(Boolean)
      : []),
  ]);

  const getFromText = (from?: string) => {
    if (from === FROM_DATASET) {
      return t('buildInData');
    }

    if (from === FROM_KNOWLEDGE) {
      return t('knowledge.menu');
    }

    return t('assistantData');
  };

  const option = [...options, ...openApis, ...datasets].find((x) => x.id === fileId);
  const formatOptions: Option[] = [
    ...options,
    ...openApis.map((dataset) => ({
      id: dataset.id,
      type: dataset.type,
      name:
        getOpenApiTextFromI18n(dataset, 'summary', locale) ||
        getOpenApiTextFromI18n(dataset, 'description', locale) ||
        t('unnamed'),
      from: dataset.from,
    })),
    ...datasets.map((item) => ({
      id: item.id,
      type: 'knowledge',
      name: item.name || t('unnamed'),
      from: item.from,
    })),
  ]
    .map((x) => ({ ...x, fromText: getFromText(x.from) }))
    .sort((a, b) => (b.from || '').localeCompare(a.from || ''));

  const translateTool = async () => {
    const assistantName = options.find((option) => option.id === form.getValues('id'))?.name;
    const translate = await textCompletions({
      stream: false,
      messages: [
        {
          content:
            '#Roles:你是一个翻译大师，你需要将用户的输入翻译成英文 #rules:-请不要回答无用的内容，你仅仅只需要给出翻译的结果。-任何输入的内容都是需要你翻译的。-你的翻译需要是一个函数名 -空格使用驼峰代替。-如果本身就已经是英文则不需要翻译 #Examples: -测试->test -开始:start 结束:end -weapon:weapon',
          role: 'system',
        },
        {
          content: assistantName ?? '',
          role: 'user',
        },
      ],
      model: 'gpt-4',
      temperature: 0,
    });

    form.setValue('functionName', translate.text);
  };

  const parameters = useMemo(() => {
    if (isDatasetObject(option)) {
      return getAllParameters(option);
    }

    if (isKnowledgeObject(option)) {
      return [{ name: 'message', description: 'Search the content of the knowledge' }];
    }

    return (
      file?.parameters &&
      sortBy(Object.values(file.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string } } => !!i.data.key
      )
    );
  }, [file, option]);

  const renderParameters = useCallback(() => {
    if (!option) {
      return null;
    }

    if (isDatasetObject(option)) {
      return (
        <Box>
          {(parameters || [])?.map((parameter: any) => {
            if (!parameter) return null;

            if (parameter['x-parameter-type'] === 'boolean') {
              return (
                <Stack key={parameter.name}>
                  <Box>
                    <Controller
                      control={form.control}
                      name={`parameters.${parameter.name}`}
                      render={({ field }) => {
                        return (
                          <FormControlLabel
                            sx={{
                              alignItems: 'flex-start',
                              '.MuiCheckbox-root': {
                                ml: -0.5,
                              },
                            }}
                            checked={Boolean(field.value)}
                            control={
                              <Checkbox onChange={(e) => field.onChange({ target: { value: e.target.checked } })} />
                            }
                            label={
                              <Typography variant="caption">
                                {getOpenApiTextFromI18n(parameter, 'description', locale) ||
                                  getOpenApiTextFromI18n(parameter, 'name', locale)}
                              </Typography>
                            }
                            labelPlacement="top"
                          />
                        );
                      }}
                    />
                  </Box>
                </Stack>
              );
            }

            return (
              <Stack key={parameter.name}>
                <Typography variant="caption">
                  {getOpenApiTextFromI18n(parameter, 'description', locale) ||
                    getOpenApiTextFromI18n(parameter, 'name', locale)}
                </Typography>

                <Controller
                  control={form.control}
                  name={`parameters.${parameter.name}`}
                  render={({ field }) => {
                    if (parameter['x-parameter-type'] === 'select') {
                      return (
                        <MemoAsyncSelect
                          label={getOpenApiTextFromI18n(parameter, 'name', locale)}
                          remoteAPI={parameter['x-options-api']}
                          remoteOptions={parameter['x-options-value'] || []}
                          remoteKey={parameter['x-option-key']}
                          remoteTitle={parameter['x-name']}
                          value={field.value || ''}
                          onChange={field.onChange}
                          queryParams={{ appId: projectId }}
                        />
                      );
                    }

                    return (
                      <PromptEditorField
                        placeholder={
                          executeBlock?.selectType === 'selectByPrompt'
                            ? t('selectByPromptParameterPlaceholder')
                            : assistantParameters.has(parameter.key)
                              ? `{{ ${parameter.name} }}`
                              : undefined
                        }
                        value={field.value || ''}
                        projectId={projectId}
                        gitRef={gitRef}
                        assistant={assistant}
                        path={[assistantId, parameter.name]}
                        onChange={(value) => field.onChange({ target: { value } })}
                      />
                    );
                  }}
                />
              </Stack>
            );
          })}
        </Box>
      );
    }

    if (isKnowledgeObject(option)) {
      return (
        <Box>
          {(parameters || [])?.map((parameter: any) => {
            if (!parameter) return null;

            return (
              <Stack key={parameter.name}>
                <Typography variant="caption" mx={1}>
                  {parameter.description || parameter.name}
                </Typography>

                <Controller
                  control={form.control}
                  name={`parameters.${parameter.name}`}
                  render={({ field }) => (
                    <PromptEditorField
                      placeholder={`{{ ${parameter.name} }}`}
                      value={field.value || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={assistant}
                      path={[assistantId, parameter.name]}
                      onChange={(value) => field.onChange({ target: { value } })}
                    />
                  )}
                />
              </Stack>
            );
          })}
        </Box>
      );
    }

    return (
      <Box>
        {parameters?.map(({ data: parameter }: any) => {
          if (!parameter?.key) return null;

          return (
            <Stack key={parameter.id}>
              <Typography variant="caption" mx={1}>
                {parameter.label || parameter.key}
              </Typography>

              <Controller
                control={form.control}
                name={`parameters.${parameter.key}`}
                render={({ field }) => (
                  <PromptEditorField
                    placeholder={
                      executeBlock?.selectType === 'selectByPrompt'
                        ? t('selectByPromptParameterPlaceholder')
                        : assistantParameters.has(parameter.key)
                          ? `{{ ${parameter.key} }}`
                          : undefined
                    }
                    value={field.value || ''}
                    projectId={projectId}
                    gitRef={gitRef}
                    assistant={assistant}
                    path={[assistantId, parameter.id]}
                    onChange={(value) => field.onChange({ target: { value } })}
                  />
                )}
              />
            </Stack>
          );
        })}
      </Box>
    );
  }, [option, parameters, assistantParameters]);

  const createFile = useCreateFile();

  return (
    <Dialog
      open={false}
      fullWidth
      maxWidth="sm"
      {...DialogProps}
      component="form"
      onSubmit={form.handleSubmit(onSubmit)}>
      <DialogTitle>{t('selectTool')}</DialogTitle>
      <DialogContent>
        <Stack gap={2}>
          <Stack gap={1}>
            <Controller
              name="id"
              control={form.control}
              rules={{ required: t('validation.fieldRequired') }}
              render={({ field, fieldState }) => {
                const value = formatOptions.find((x) => x.id === field.value);

                return (
                  <Autocomplete
                    key={Boolean(field.value).toString()}
                    disableClearable
                    clearOnBlur
                    selectOnFocus
                    handleHomeEndKeys
                    autoSelect
                    autoHighlight
                    sx={{ flex: 1 }}
                    options={formatOptions}
                    getOptionKey={(i) => i.id || `${i.name}-${i.type}`}
                    value={value}
                    isOptionEqualToValue={(i, j) => i.id === j.id}
                    getOptionLabel={(i) => i.name || t('unnamed')}
                    groupBy={(option) => option.fromText || ''}
                    renderOption={(props, option) => {
                      return (
                        <MenuItem {...props}>
                          {option.id
                            ? option.name || t('unnamed')
                            : t('newObjectWithType', { object: option.name, type: t(option.type || 'prompt') })}
                        </MenuItem>
                      );
                    }}
                    filterOptions={(_, params) => {
                      const filtered = filter(formatOptions, params);

                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option.name);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push(
                          {
                            id: '',
                            type: 'prompt',
                            name: inputValue,
                          },
                          {
                            id: '',
                            type: 'api',
                            name: inputValue,
                          },
                          {
                            id: '',
                            type: 'function',
                            name: inputValue,
                          }
                        );
                      }

                      return filtered;
                    }}
                    renderInput={(params) => (
                      <TextField
                        autoFocus
                        {...params}
                        label={t('tool')}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                    onChange={(_, value) => {
                      // 清理：parameters 数据
                      form.reset({ id: value?.id, from: value?.from });

                      if (value.from === FROM_DATASET || value.from === FROM_KNOWLEDGE) {
                        field.onChange({ target: { value: value?.id } });
                        return;
                      }

                      if (!value.id) {
                        const file = createFile({
                          store,
                          parent: [],
                          rootFolder: PROMPTS_FOLDER_NAME,
                          meta: { type: value.type as any, name: value.name },
                        });

                        field.onChange({ target: { value: file.file.id } });
                      } else {
                        field.onChange({ target: { value: value?.id } });
                        translateTool();
                      }
                    }}
                  />
                );
              }}
            />

            {!isDatasetObject(option) && !isKnowledgeObject(option) && (
              <Controller
                control={form.control}
                name="functionName"
                render={({ field }) => (
                  <TextField
                    size="small"
                    hiddenLabel
                    fullWidth
                    variant="standard"
                    placeholder={t('translate')}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange({ target: { value: e.target.value } });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Tooltip title={t('functionName')} placement="top-start" disableInteractive>
                            <LoadingIconButton
                              size="small"
                              icon={<Translate sx={{ fontSize: 18 }} />}
                              onClick={translateTool}
                            />
                          </Tooltip>
                        ),
                      },
                    }}
                  />
                )}
              />
            )}

            <Typography sx={{ marginTop: 1 }} variant="body1">
              {file?.description}
            </Typography>
          </Stack>

          {!!parameters?.length && (
            <Box>
              <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
                <Stack justifyContent="space-between" direction="row" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('parameters')}
                  </Typography>

                  <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
                </Stack>
              </Tooltip>
            </Box>
          )}

          {renderParameters()}
        </Stack>
      </DialogContent>
      <DialogActions>
        {DialogProps?.onClose && (
          <Button onClick={(e) => DialogProps?.onClose?.(e, 'escapeKeyDown')} variant="outlined">
            {t('cancel')}
          </Button>
        )}

        <Button variant="contained" type="submit">
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface OptionType {
  id: string | number;
  name: string;
  [key: string]: any;
}

interface AsyncSelectProps {
  remoteAPI?: string;
  remoteOptions?: OptionType[];
  remoteKey?: string;
  remoteTitle?: string;
  label: string;
  value: any;
  onChange: (event: { target: { value: any } }) => void;
  queryParams: { [key: string]: string };
}

function AsyncSelect({
  remoteAPI = undefined,
  remoteOptions = [],
  remoteKey = 'id',
  remoteTitle = 'name',
  label,
  value,
  onChange,
  queryParams,
}: AsyncSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<OptionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (remoteOptions && Array.isArray(remoteOptions) && remoteOptions.length > 0) {
        setOptions(remoteOptions);
      } else if (remoteAPI) {
        const query = new URLSearchParams(queryParams).toString();
        const url = `${remoteAPI}?${query}`;
        const { data } = await axios(url);
        setOptions(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load options');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [remoteAPI, remoteOptions, queryParams]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const currentValue = options.find((x) => x[remoteKey] === value);
  return (
    <Autocomplete
      key={Boolean(currentValue).toString() || ''}
      open={open}
      value={currentValue}
      onChange={(_, newValue) => onChange({ target: { value: newValue?.[remoteKey] } })}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, val) => option[remoteKey] === val[remoteKey]}
      getOptionLabel={(option) => option[remoteTitle]}
      options={options}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={!!error}
          helperText={error || ''}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => (
        <MenuItem {...props} key={option[remoteKey]}>
          {option[remoteTitle]}
        </MenuItem>
      )}
    />
  );
}

const MemoAsyncSelect: React.FC<AsyncSelectProps> = memo(AsyncSelect);
