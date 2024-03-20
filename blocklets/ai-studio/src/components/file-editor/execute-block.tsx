import { textCompletions } from '@app/libs/ai';
import Translate from '@app/pages/project/icons/translate';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ExecuteBlock,
  ExecuteBlockYjs,
  FileTypeYjs,
  Role,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import getDatasetTextByI18n from '@blocklet/dataset-sdk/util/get-dataset-i18n-text';
import { InfoOutlined as MuiInfoOutlined } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Divider,
  MenuItem,
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
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAssistantCompare } from 'src/pages/project/state';
import { joinURL } from 'ufo';

import NewDataset from '../../../api/src/store/models/dataset/dataset';
import { getAPIList, getDatasets } from '../../libs/dataset';
import Add from '../../pages/project/icons/add';
import External from '../../pages/project/icons/external';
import InfoOutlined from '../../pages/project/icons/question';
import Trash from '../../pages/project/icons/trash';
import { PROMPTS_FOLDER_NAME, useCreateFile, useProjectStore } from '../../pages/project/yjs-state';
import IndicatorTextField from '../awareness/indicator-text-field';
import LoadingIconButton from '../loading/loading-icon-button';
import { ModelPopper, ModelSetting } from '../modal-settings';
import PromptEditorField from './prompt-editor-field';

const FROM_DATASET = 'dataset';
const FROM_KNOWLEDGE = 'knowledge';

export default function ExecuteBlockForm({
  projectId,
  gitRef,
  assistant,
  value,
  readOnly,
  path,
  compareAssistant,
  isRemoteCompare,
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
} & StackProps) {
  const { t, locale } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const navigate = useNavigate();
  const toolForm = useRef<ToolDialogImperative>(null);

  const { store } = useProjectStore(projectId, gitRef);

  const { data: datasets = [] } = useRequest(() => getAPIList());
  const { data: knowledge = [] } = useRequest(() => getDatasets(projectId));

  const { getDiffBackground } = useAssistantCompare({
    value: assistant,
    compareValue: compareAssistant,
    readOnly,
    isRemoteCompare,
  });

  const tools = value.tools && sortBy(Object.values(value.tools), (i) => i.index);

  return (
    <Stack {...props} sx={{ border: 2, borderColor: 'warning.main', borderRadius: 1, p: 1, gap: 1, ...props.sx }}>
      <Box display="flex" alignItems="center">
        <Tooltip
          title={t('executeBlockNameTip', { exampleVariable: '{exampleVariable}' })}
          placement="top"
          disableInteractive>
          <MuiInfoOutlined fontSize="small" sx={{ mr: 0.5, color: 'grey.500' }} />
        </Tooltip>
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
              sx: {
                backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.variable`) },
              },
            },
            value: value.variable ?? '',
            onChange: (e) => (value.variable = e.target.value),
          }}
        />
      </Box>

      <Divider />
      <Accordion
        sx={{
          '&::before': {
            display: 'none',
          },
        }}
        square
        disableGutters
        elevation={0}>
        <AccordionSummary
          sx={{
            px: 1,
            minHeight: 28,
            '& .MuiAccordionSummary-content': {
              my: 0,
            },
          }}
          expandIcon={<GridExpandMoreIcon />}>
          <Typography variant="subtitle2">{t('executeSettings')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, px: 1, mt: 0.5, gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" alignItems="baseline" justifyContent="space-between">
            <Box display="flex">
              <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('executeMethods')}</Typography>
              <Tooltip title={t('executeMethodsTip')} placement="top" disableInteractive>
                <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
              </Tooltip>
            </Box>
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
          {value.selectType === 'selectByPrompt' && (
            <Box display="flex" justifyContent="space-between">
              <Box display="flex" alignItems="center">
                <Typography sx={{ whiteSpace: 'nowrap' }}>{t('prompt')}</Typography>
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
              <Box width="60%">
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
          )}
        </AccordionDetails>
      </Accordion>
      <Divider />

      <Accordion
        sx={{
          '&::before': {
            display: 'none',
          },
        }}
        square
        disableGutters
        elevation={0}>
        <AccordionSummary
          sx={{
            px: 1,
            minHeight: 28,
            '& .MuiAccordionSummary-content': {
              my: 0,
            },
          }}
          expandIcon={<GridExpandMoreIcon />}>
          <Typography variant="subtitle2">{t('outputSettings')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, mt: 0.5, px: 1, gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          {assistant.type === 'prompt' && (
            <Box display="flex" alignItems="baseline" justifyContent="space-between">
              <Box display="flex">
                <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('outputRole')}</Typography>
                <Tooltip title={t('outputRoleTip')} placement="top" disableInteractive>
                  <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
                </Tooltip>
              </Box>
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
          )}
          {value.role !== 'none' && value.formatResultType !== 'asHistory' && (
            <>
              {assistant.type === 'prompt' && (
                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                  <Box display="flex">
                    <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('outputPrefix')}</Typography>
                    <Tooltip title={t('outputPrefixTip')} placement="top" disableInteractive>
                      <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
                    </Tooltip>
                  </Box>
                  <Box width="60%">
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
                </Box>
              )}
              {assistant.type === 'prompt' && (
                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                  <Box display="flex">
                    <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('outputSuffix')}</Typography>
                    <Tooltip title={t('outputSuffixTip')} placement="top" disableInteractive>
                      <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
                    </Tooltip>
                  </Box>
                  <Box width="60%">
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
                </Box>
              )}
            </>
          )}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography sx={{ whiteSpace: 'nowrap' }}>{t('formatResult')}</Typography>
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
        </AccordionDetails>
      </Accordion>
      <Divider />

      <Accordion
        sx={{
          '&::before': {
            display: 'none',
          },
        }}
        square
        disableGutters
        elevation={0}>
        <AccordionSummary
          sx={{
            px: 1,
            minHeight: 28,
            '& .MuiAccordionSummary-content': {
              my: 0,
            },
          }}
          expandIcon={<GridExpandMoreIcon />}>
          <Typography variant="subtitle2">{t('tool')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, px: 1, gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          {(!tools || tools?.length === 0) && (
            <Typography alignSelf="center" mt={1} px={1} variant="caption" color="text.secondary">
              {t('emptyToolPlaceholder')}
            </Typography>
          )}
          {tools?.map(({ data: tool }) => {
            const f = store.files[tool.id];
            const file = f && isAssistant(f) ? f : undefined;
            if (!file) {
              const dataset = datasets.find((x) => x.id === tool.id);

              if (dataset) {
                return (
                  <Stack
                    key={dataset.id}
                    direction="row"
                    sx={{
                      minHeight: 32,
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
                      backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.tools.${tool.id}`) },
                    }}
                    onClick={() => {
                      if (readOnly) return;
                      toolForm.current?.form.reset(cloneDeep(tool));
                      dialogState.open();
                    }}>
                    <Typography noWrap maxWidth="50%">
                      {getDatasetTextByI18n(dataset, 'summary', locale) || t('unnamed')}
                    </Typography>

                    <Typography variant="body1" color="text.secondary" flex={1} noWrap>
                      {getDatasetTextByI18n(dataset, 'description', locale)}
                    </Typography>

                    {!readOnly && (
                      <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={1}>
                        <Button
                          sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const doc = (getYjsValue(value) as Map<any>).doc!;
                            doc.transact(() => {
                              if (value.tools) {
                                delete value.tools[tool.id];
                                sortBy(Object.values(value.tools), 'index').forEach((i, index) => (i.index = index));
                              }
                            });
                          }}>
                          <Trash sx={{ fontSize: 18 }} />
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                );
              }

              const found = knowledge.find((x) => x.id === tool.id);
              if (found) {
                return (
                  <Stack
                    key={found.id}
                    direction="row"
                    sx={{
                      minHeight: 32,
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
                      backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.tools.${tool.id}`) },
                    }}
                    onClick={() => {
                      if (readOnly) return;
                      toolForm.current?.form.reset(cloneDeep(tool));
                      dialogState.open();
                    }}>
                    <Typography variant="subtitle2" noWrap maxWidth="50%">
                      {found.name}
                    </Typography>

                    <Typography variant="body1" color="text.secondary" flex={1} noWrap>
                      {found.description}
                    </Typography>

                    {!readOnly && (
                      <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={1}>
                        <Button
                          sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const doc = (getYjsValue(value) as Map<any>).doc!;
                            doc.transact(() => {
                              if (value.tools) {
                                delete value.tools[tool.id];
                                sortBy(Object.values(value.tools), 'index').forEach((i, index) => (i.index = index));
                              }
                            });
                          }}>
                          <Trash sx={{ fontSize: 18 }} />
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                );
              }

              return null;
            }

            return (
              <Stack
                key={file.id}
                direction="row"
                sx={{
                  minHeight: 32,
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
                  backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.tools.${tool.id}`) },
                }}
                onClick={() => {
                  if (readOnly) return;
                  toolForm.current?.form.reset(cloneDeep(tool));
                  dialogState.open();
                }}>
                <Typography noWrap maxWidth="50%">
                  {file.name || t('unnamed')}
                </Typography>

                <Typography variant="body1" color="text.secondary" flex={1} noWrap>
                  {file.description}
                </Typography>

                {!readOnly && (
                  <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={1}>
                    <Button
                      sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const doc = (getYjsValue(value) as Map<any>).doc!;
                        doc.transact(() => {
                          if (value.selectType === 'selectByPrompt') {
                            const selectTool = value.tools?.[tool.id];
                            if (selectTool) {
                              selectTool.data.onEnd = undefined;
                            }
                          }
                          if (value.tools) {
                            delete value.tools[tool.id];
                            sortBy(Object.values(value.tools), 'index').forEach((i, index) => (i.index = index));
                          }
                        });
                      }}>
                      <Trash sx={{ fontSize: 18 }} />
                    </Button>

                    <Button
                      sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(joinURL('.', `${file.id}.yaml`));
                      }}>
                      <External sx={{ fontSize: 18 }} />
                    </Button>
                  </Stack>
                )}
              </Stack>
            );
          })}

          {!readOnly && (
            <Box>
              <Button
                startIcon={<Add />}
                onClick={() => {
                  toolForm.current?.form.reset({ id: undefined, parameters: undefined });
                  dialogState.open();
                }}>
                {t('addObject', { object: t('tool') })}
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
        datasets={datasets.map((x) => ({ ...x, from: FROM_DATASET }))}
        knowledge={knowledge.map((x) => ({ ...x, from: FROM_KNOWLEDGE }))}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;
          doc.transact(() => {
            value.tools ??= {};

            const old = value.tools[tool.id];

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

type Option = {
  id: NonNullable<ExecuteBlock['tools']>[number]['id'];
  type: Exclude<FileTypeYjs, { $base64: string }>['type'] | string;
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

interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}

export const ToolDialog = forwardRef<
  ToolDialogImperative,
  {
    executeBlock: ExecuteBlockYjs;
    projectId: string;
    gitRef: string;
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
    assistant: AssistantYjs;
    datasets: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
    knowledge: (NewDataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  }
>(({ datasets, knowledge, executeBlock, assistant, projectId, gitRef, onSubmit, DialogProps }, ref) => {
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

  const option = [...options, ...datasets, ...knowledge].find((x) => x.id === fileId);
  const formatOptions: Option[] = [
    ...options,
    ...datasets.map((dataset) => ({
      id: dataset.id,
      type: dataset.type,
      name:
        getDatasetTextByI18n(dataset, 'summary', locale) ||
        getDatasetTextByI18n(dataset, 'description', locale) ||
        t('unnamed'),
      from: dataset.from,
    })),
    ...knowledge.map((item) => ({
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

            return (
              <Stack key={parameter.name}>
                <Typography variant="caption" mx={1}>
                  {getDatasetTextByI18n(parameter, 'description', locale) ||
                    getDatasetTextByI18n(parameter, 'name', locale)}
                </Typography>

                <Controller
                  control={form.control}
                  name={`parameters.${parameter.name}`}
                  render={({ field }) => {
                    if (parameter['x-input-type'] === 'select') {
                      return (
                        <AsyncSelect
                          label={getDatasetTextByI18n(parameter, 'name', locale)}
                          remoteAPI={parameter['x-options-api']}
                          remoteOptions={parameter['x-options-value'] || []}
                          remoteKey={parameter['x-option-key']}
                          remoteTitle={parameter['x-name']}
                          value={field.value || ''}
                          onChange={field.onChange}
                          queryParams={{ projectId }}
                        />
                      );
                    }

                    return (
                      <PromptEditorField
                        placeholder={
                          executeBlock.selectType === 'selectByPrompt'
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
                      executeBlock.selectType === 'selectByPrompt'
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

                        field.onChange({ target: { value: file.template.id } });
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
                    InputProps={{
                      startAdornment: (
                        <Tooltip title={t('functionName')} placement="top-start" disableInteractive>
                          <LoadingIconButton
                            size="small"
                            icon={<Translate sx={{ fontSize: 18 }} />}
                            onClick={translateTool}
                          />
                        </Tooltip>
                      ),
                    }}
                    placeholder={t('translate')}
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange({ target: { value: e.target.value } });
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
          <Button onClick={(e) => DialogProps?.onClose?.(e, 'escapeKeyDown')}>{t('cancel')}</Button>
        )}

        <Button variant="contained" type="submit">
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

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

const AsyncSelect: React.FC<AsyncSelectProps> = memo(
  ({
    remoteAPI,
    remoteOptions = [],
    remoteKey = 'id',
    remoteTitle = 'name',
    label,
    value,
    onChange,
    queryParams,
  }: AsyncSelectProps) => {
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
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
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
);
