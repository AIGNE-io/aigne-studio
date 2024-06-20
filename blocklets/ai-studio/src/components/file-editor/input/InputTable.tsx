import { ResourceType } from '@api/libs/resource';
import Dataset from '@api/store/models/dataset/dataset';
import AgentSelect from '@app/components/agent-select';
import WithAwareness from '@app/components/awareness/with-awareness';
import { DragSortListYjs } from '@app/components/drag-sort-list';
import LoadingButton from '@app/components/loading/loading-button';
import PopperMenu, { PopperMenuImperative } from '@app/components/menu/PopperMenu';
import PasswordField from '@app/components/PasswordField';
import { useCurrentProject } from '@app/contexts/project';
import { getDatasets } from '@app/libs/dataset';
import { getProjectIconUrl } from '@app/libs/project';
import { createOrUpdateSecrets, getSecrets } from '@app/libs/secret';
import Close from '@app/pages/project/icons/close';
import { useAssistantCompare } from '@app/pages/project/state';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useAgent } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ExecuteBlock, ParameterYjs, StringParameter } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import getDatasetTextByI18n from '@blocklet/dataset-sdk/util/get-dataset-i18n-text';
import { Icon } from '@iconify-icon/react';
import BracesIcon from '@iconify-icons/tabler/braces';
import BracketsContainIcon from '@iconify-icons/tabler/brackets-contain';
import CheckIcon from '@iconify-icons/tabler/check';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import CursorTextIcon from '@iconify-icons/tabler/cursor-text';
import DatabaseIcon from '@iconify-icons/tabler/database';
import DotsIcon from '@iconify-icons/tabler/dots';
import FormsIcon from '@iconify-icons/tabler/forms';
import GripVertical from '@iconify-icons/tabler/grip-vertical';
import HistoryIcon from '@iconify-icons/tabler/history';
import InfoCircleIcon from '@iconify-icons/tabler/info-circle';
import MessageIcon from '@iconify-icons/tabler/message';
import SquareNumberIcon from '@iconify-icons/tabler/square-number-1';
import {
  Autocomplete,
  AutocompleteValue,
  Avatar,
  AvatarProps,
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Input,
  Link,
  List,
  ListItemIcon,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  createFilterOptions,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import { get, sortBy } from 'lodash';
import { PopupState, bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAsync } from 'react-use';

import Switch from '../../custom/switch';
import ParameterConfig from '../../template-form/parameter-config';
import ParameterConfigType from '../../template-form/parameter-config/type';
import { FROM_KNOWLEDGE } from '../execute-block';
import History from '../history';
import PromptEditorField from '../prompt-editor-field';
import SelectVariable from '../select-variable';
import useVariablesEditorOptions from '../use-variables-editor-options';
import AddInputButton from './AddInputButton';

const FROM_PARAMETER = 'agentParameter';
const FROM_KNOWLEDGE_PARAMETER = 'knowledgeParameter';
const FROM_API_PARAMETER = 'blockletAPIParameter';

export default function InputTable({
  assistant,
  projectId,
  gitRef,
  readOnly,
  compareValue,
  isRemoteCompare,
  openApis = [],
}: {
  assistant: AssistantYjs;
  projectId: string;
  gitRef: string;
  readOnly?: boolean;
  compareValue?: AssistantYjs;
  isRemoteCompare?: boolean;
  openApis?: DatasetObject[];
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(assistant) as Map<any>)?.doc!;
  const { highlightedId, deleteParameter } = useVariablesEditorOptions(assistant);
  const { getDiffBackground } = useAssistantCompare({ value: assistant, compareValue, readOnly, isRemoteCompare });
  const { getVariables } = useProjectStore(projectId, gitRef);

  const isValidVariableName = (name: string) => {
    if (!name) return true;

    const validNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validNameRegex.test(name);
  };

  const parameters = sortBy(Object.values(assistant.parameters ?? {}), (i) => i.index);
  const { data: knowledge = [] } = useRequest(() => getDatasets());

  const FROM_MAP = useMemo(() => {
    return {
      custom: t('variableParameter.custom'),
      tool: t('variableParameter.tool'),
      datastore: t('variableParameter.datastore'),
      knowledge: t('variableParameter.knowledge'),
      blockletAPI: 'API',
      secret: t('variableParameter.secret'),
    };
  }, [t]);

  const TYPE_MAP: any = useMemo(() => {
    return {
      string: t('text'),
      number: t('number'),
      object: t('object'),
      array: t('array'),
    };
  }, [t]);

  const TYPE_ICON_MAP: any = useMemo(() => {
    return {
      string: <Icon icon={CursorTextIcon} />,
      number: <Icon icon={SquareNumberIcon} />,
      object: <Icon icon={BracesIcon} />,
      array: <Icon icon={BracketsContainIcon} />,
    };
  }, [t]);

  const columns = useMemo<GridColDef<(typeof parameters)[number]>[]>(() => {
    return [
      {
        field: 'key',
        width: '30%' as any,
        headerName: t('name'),
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.key === 'question' || parameter.key === 'chatHistory') {
            const iconMap = {
              question: MessageIcon,
              datasetId: DatabaseIcon,
              chatHistory: HistoryIcon,
            };

            return (
              <Box height={33} display="flex" alignItems="center" gap={0.5}>
                <Box component={Icon} icon={iconMap[parameter.key]} fontSize={16} />
                <Box>{parameter.key}</Box>
              </Box>
            );
          }

          return (
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Box component={Icon} icon={FormsIcon} fontSize={16} />

              <WithAwareness
                projectId={projectId}
                gitRef={gitRef}
                sx={{ top: 4, right: -8 }}
                path={[assistant.id, 'parameters', parameter?.id ?? '', 'key']}>
                <Input
                  id={`${parameter.id}-key`}
                  fullWidth
                  readOnly={readOnly}
                  placeholder={t('inputParameterKeyPlaceholder')}
                  value={parameter.key || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();

                    if (isValidVariableName(value)) {
                      parameter.key = value;
                    }
                  }}
                />
              </WithAwareness>
            </Stack>
          );
        },
      },
      {
        field: 'from',
        headerName: t('from'),
        flex: 1,
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.type === 'source' && parameter.source?.variableFrom === 'history') {
            return <Box>{t('history.title')}</Box>;
          }

          return (
            <SelectFromSource
              FROM_MAP={FROM_MAP}
              knowledge={knowledge}
              openApis={openApis}
              parameter={parameter}
              readOnly={readOnly}
              value={assistant}
              projectId={projectId}
              gitRef={gitRef}
            />
          );
        },
      },
      {
        field: 'type',
        headerName: t('format'),
        width: 100,
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.type === 'source' && parameter.source?.variableFrom === 'secret') {
            return <Box />;
          }

          if (parameter.type === 'source' && parameter.source) {
            const { source } = parameter;
            if (source.variableFrom === 'tool') {
              return (
                <Stack direction="row" alignItems="center">
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <Icon icon={BracesIcon} />
                  </ListItemIcon>

                  {t('agentOutput')}
                </Stack>
              );
            }

            if (source.variableFrom === 'datastore') {
              const variables = getVariables();
              const variable = (variables?.variables || []).find(
                (x) => x.key === source.variable?.key && x.scope && source.variable.scope
              );
              return (
                <Stack direction="row" alignItems="center">
                  {variable?.type?.type ? (
                    <>
                      <ListItemIcon sx={{ minWidth: 20 }}>{TYPE_ICON_MAP[variable.type.type]}</ListItemIcon>
                      {TYPE_MAP[variable?.type?.type]}
                    </>
                  ) : (
                    ''
                  )}
                </Stack>
              );
            }

            if (parameter.source.variableFrom === 'knowledge') {
              return (
                <Stack direction="row" alignItems="center">
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <Icon icon={CursorTextIcon} />
                  </ListItemIcon>

                  {TYPE_MAP.string}
                </Stack>
              );
            }

            if (parameter.source.variableFrom === 'history') {
              return <Box />;
            }

            if (parameter.source.variableFrom === 'blockletAPI') {
              return <Box />;
            }
          }

          return (
            <SelectInputType
              parameter={parameter}
              readOnly={readOnly}
              value={assistant}
              projectId={projectId}
              gitRef={gitRef}
            />
          );
        },
      },
      {
        field: 'actions',
        width: 100,
        headerAlign: 'right',
        align: 'right',
      },
    ];
  }, [t, knowledge, openApis, readOnly, doc, deleteParameter]);

  return (
    <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, overflow: 'auto' }}>
      <Box
        sx={{
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          table: {
            'tr:last-of-type': {
              'th,td': {
                borderBottom: 1,
                borderColor: 'divider',
              },
            },
            'tr.group-header': {
              borderTop: 1,
              borderColor: 'divider',
            },
            'tr:not(.group-header):hover td': { bgcolor: 'grey.100' },
            'th,td': {
              borderBottom: 0,
              py: 0,
              px: 0,
              '&:not(:first-of-type)': { pl: 1 },
              '&:first-of-type': { pl: 1.5 },
              '&:last-of-type': { pr: 1.5 },
            },
            th: { pb: 0.5 },
          },
        }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  align={column.headerAlign}
                  width={column.width}
                  sx={{ px: 0, py: 1, fontWeight: 500, fontSize: 13, lineHeight: '22px' }}>
                  {column.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <DragSortListYjs
            disabled={readOnly}
            list={assistant.parameters! ?? []}
            component={TableBody}
            renderItem={(parameter, _, params) => {
              return (
                <TableRow
                  key={parameter.id}
                  ref={(ref) => {
                    params.drop(ref);
                    params.preview(ref);
                  }}
                  sx={{
                    backgroundColor:
                      parameter.id === highlightedId
                        ? (theme) => alpha(theme.palette.warning.light, theme.palette.action.focusOpacity)
                        : 'transparent',
                    transition: 'all 2s',
                    '.hover-visible': {
                      display: 'none',
                    },
                    ':hover': {
                      '.hover-visible': {
                        display: 'flex',
                      },
                    },
                  }}>
                  {columns.map((column, index) => {
                    return (
                      index !== columns.length - 1 && (
                        <TableCell
                          key={column.field}
                          align={column.align}
                          sx={{
                            position: 'relative',
                            px: 0,
                            ...getDiffBackground('parameters', parameter.id),
                          }}>
                          {index === 0 && (
                            <Stack
                              className="hover-visible center"
                              ref={params.drag}
                              sx={{
                                p: 0.5,
                                cursor: 'move',
                                position: 'absolute',
                                left: -6,
                                top: '50%',
                                transform: 'translateY(-50%)',
                              }}>
                              <Box component={Icon} icon={GripVertical} sx={{ color: '#9CA3AF', fontSize: 14 }} />
                            </Stack>
                          )}

                          {column.renderCell?.({ row: { data: parameter } } as any) || get(parameter, column.field)}
                        </TableCell>
                      )
                    );
                  })}

                  <TableCell sx={{ px: 0, ...getDiffBackground('parameters', parameter.id) }} align="right">
                    {!readOnly && (
                      <PopperButton
                        knowledge={knowledge.map((x) => ({ ...x, from: FROM_KNOWLEDGE }))}
                        openApis={openApis}
                        parameter={parameter}
                        readOnly={readOnly}
                        value={assistant}
                        projectId={projectId}
                        gitRef={gitRef}
                        onDelete={() => deleteParameter(parameter)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            }}
          />
        </Table>
      </Box>

      <Stack direction="row" mt={1}>
        {!readOnly && <AddInputButton assistant={assistant} />}
      </Stack>
    </Box>
  );
}

function SelectFromSource({
  FROM_MAP,
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
  openApis,
}: {
  FROM_MAP: { [key: string]: string };
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
}) {
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });
  const { t } = useLocaleContext();
  const ref = useRef<PopperMenuImperative>(null);

  const currentKey = parameter.type === 'source' ? parameter.source?.variableFrom : 'custom';
  const fromTitle =
    parameter.type === 'source' && parameter.source?.variableFrom === 'tool' && parameter?.source?.agent?.id ? (
      <span>
        {t('variableParameter.call')}{' '}
        <AgentName type="tool" projectId={parameter.source.agent.projectId} agentId={parameter.source.agent.id} />
      </span>
    ) : (
      FROM_MAP[currentKey || 'custom']
    );

  return (
    <>
      <PopperMenu
        ref={ref}
        BoxProps={{
          sx: { my: 1, p: 0, cursor: 'pointer' },
          children: (
            <Box>
              <Box className="center" gap={1} justifyContent="flex-start">
                <Box>{fromTitle}</Box>
                <Box component={Icon} icon={ChevronDownIcon} width={15} />
              </Box>
            </Box>
          ),
        }}
        PopperProps={{ placement: 'bottom-start' }}>
        {Object.entries(FROM_MAP).map(([key, value]) => {
          return (
            <MenuItem
              key={key}
              selected={key === currentKey}
              onClick={(e) => {
                e.stopPropagation();

                if (key !== currentKey) {
                  parameter.type = 'string';

                  if (key !== 'custom') {
                    parameter.type = 'source';
                    if (parameter.type === 'source') {
                      parameter.source ??= {};
                      parameter.source.variableFrom = key as any;
                    }
                  }

                  ref.current?.close();
                  dialogState.open();
                }
              }}>
              {/* <ListItemIcon>{value}</ListItemIcon> */}
              <Box flex={1}>{value}</Box>
              <Box sx={{ width: 40, textAlign: 'right' }}>
                {key === currentKey && <Box component={Icon} icon={CheckIcon} />}
              </Box>
            </MenuItem>
          );
        })}
      </PopperMenu>

      <SelectFromSourceDialog
        knowledge={knowledge}
        openApis={openApis}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
        dialogState={dialogState}
      />
    </>
  );
}

export function AgentName({
  type,
  projectId,
  agentId,
  showIcon,
  IconProps,
}: {
  type: ResourceType;
  projectId?: string;
  agentId: string;
  showIcon?: boolean;
  IconProps?: AvatarProps;
}) {
  const { t } = useLocaleContext();

  const agent = useAgent({ type, projectId, agentId });
  if (!agent) return null;

  return (
    <>
      {showIcon && (
        <Avatar
          src={getProjectIconUrl(agent.project.id, agent.project.updatedAt)}
          {...IconProps}
          sx={{ width: 22, height: 22, ...IconProps?.sx }}
        />
      )}
      {agent.name || t('unnamed')}
    </>
  );
}

function SelectInputType({
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
}) {
  const multiline = (!parameter.type || parameter.type === 'string') && parameter?.multiline;
  const doc = (getYjsValue(value) as Map<any>)?.doc!;
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });

  return (
    <>
      <WithAwareness
        projectId={projectId}
        gitRef={gitRef}
        sx={{ top: 4, right: -8 }}
        path={[value.id, 'parameters', parameter?.id ?? '', 'type']}>
        <ParameterConfigType
          disabled={parameter.from === FROM_PARAMETER || parameter.from === FROM_KNOWLEDGE_PARAMETER}
          variant="standard"
          hiddenLabel
          SelectProps={{ autoWidth: true }}
          value={multiline ? 'multiline' : parameter?.type ?? 'string'}
          InputProps={{ readOnly }}
          onChange={(e) => {
            const newValue = e.target.value;

            if (newValue === 'select') {
              dialogState.open();
            }

            doc.transact(() => {
              if (newValue === 'multiline') {
                parameter.type = 'string';
                (parameter as StringParameter)!.multiline = true;
              } else {
                parameter.type = newValue as any;
                if (typeof (parameter as StringParameter).multiline !== 'undefined') {
                  delete (parameter as StringParameter)!.multiline;
                }
              }
            });
          }}
        />
      </WithAwareness>

      <SelectFromSourceDialog
        dialogState={dialogState}
        knowledge={[]}
        openApis={[]}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
      />
    </>
  );
}

function SelectFromSourceDialog({
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
  openApis,
  dialogState,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  dialogState: PopupState;
}) {
  const { t } = useLocaleContext();
  const { addParameter } = useVariablesEditorOptions(value);

  const renderParameterSettings = (parameter: ParameterYjs) => {
    if (parameter.type === 'source' && parameter.source) {
      if (parameter.source.variableFrom === 'secret') {
        return <SecretParameterView parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'tool') {
        return <AgentParameter value={value} parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'datastore') {
        return <DatastoreParameter projectId={projectId} gitRef={gitRef} parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'knowledge') {
        return (
          <KnowledgeParameter
            projectId={projectId}
            gitRef={gitRef}
            value={value}
            parameter={parameter}
            knowledge={knowledge}
          />
        );
      }

      if (parameter.source.variableFrom === 'history') {
        return <HistoryParameter projectId={projectId} gitRef={gitRef} value={value} parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'blockletAPI') {
        return (
          <APIParameter projectId={projectId} gitRef={gitRef} value={value} parameter={parameter} openApis={openApis} />
        );
      }
    }

    if (parameter) {
      return <ParameterConfig readOnly={readOnly} value={parameter} />;
    }

    return null;
  };

  return (
    <Dialog {...bindDialog(dialogState)} fullWidth maxWidth="sm" component="form" onSubmit={(e) => e.preventDefault()}>
      <DialogTitle className="between">
        <Box>{t('setting')}</Box>

        <IconButton size="small" onClick={dialogState.close}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack gap={1.5}>{renderParameterSettings(parameter)}</Stack>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={() => {
            // 新增选择 tool 和 knowledge 未定义的参数
            if (parameter.type === 'source' && parameter?.source?.variableFrom === 'tool' && parameter?.source) {
              const { source } = parameter;
              Object.entries(source?.agent?.parameters || {}).forEach(([key, value]: any) => {
                if (value === '') {
                  if (source && source?.agent && source?.agent?.parameters) {
                    source.agent.parameters[key] = `{{${key}}}`;
                  }

                  addParameter(key, { from: FROM_PARAMETER });
                }
              });
            }

            if (parameter.type === 'source' && parameter?.source?.variableFrom === 'blockletAPI' && parameter?.source) {
              const { source } = parameter;
              Object.entries(source?.api?.parameters || {}).forEach(([key, value]: any) => {
                if (value === '') {
                  if (source && source?.api && source?.api?.parameters) {
                    source.api.parameters[key] = `{{${key}}}`;
                  }

                  addParameter(key, { from: FROM_API_PARAMETER });
                }
              });
            }

            if (parameter.type === 'source' && parameter?.source?.variableFrom === 'knowledge' && parameter?.source) {
              const { source } = parameter;
              if (
                source &&
                source?.knowledge &&
                source?.knowledge?.parameters &&
                !source?.knowledge?.parameters?.message &&
                !source?.knowledge?.parameters.searchAll
              ) {
                source.knowledge.parameters.message = '{{message}}';
                addParameter('message', { from: FROM_KNOWLEDGE_PARAMETER });
              }
            }

            dialogState.close();
          }}>
          {t('ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function HistoryParameter({
  projectId,
  gitRef,
  value,
  parameter,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  parameter: ParameterYjs;
}) {
  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'history') {
    return (
      <Stack gap={2}>
        <History projectId={projectId} gitRef={gitRef} value={value} parameter={parameter} />
      </Stack>
    );
  }

  return null;
}

type Option = {
  id: string;
  name?: string;
  from?: string;
  parameters?: { [key: string]: any };
};

export function SelectTool<Multiple extends boolean | undefined>({
  placeholder,
  options,
  value,
  onChange,
  multiple,
  renderOption,
}: {
  placeholder?: string;
  options: Option[];
  multiple?: Multiple;
  value?: AutocompleteValue<Option, Multiple, false, false>;
  onChange?: (value: AutocompleteValue<Option, Multiple, false, false>) => void;
  renderOption?: (props: any, option: Option) => any;
}) {
  const { t } = useLocaleContext();

  return (
    <Autocomplete
      size="medium"
      key={Boolean(value).toString()}
      disableClearable
      selectOnFocus
      handleHomeEndKeys
      multiple={multiple}
      disableCloseOnSelect={multiple}
      sx={{ flex: 1 }}
      options={options}
      getOptionKey={(i) => i.id || `${i.name}`}
      value={value}
      isOptionEqualToValue={(i, j) => i.id === j.id}
      getOptionLabel={(i) => i.name || t('unnamed')}
      renderOption={(props, option) => {
        if (renderOption) {
          return renderOption(props, option);
        }

        return (
          <MenuItem {...props} key={option.name}>
            {option.name || t('unnamed')}
          </MenuItem>
        );
      }}
      filterOptions={(_, params) => {
        return filter(options, params);
      }}
      renderInput={(params) => <TextField hiddenLabel {...params} placeholder={placeholder} size="medium" />}
      onChange={(_, val) => onChange?.(val)}
    />
  );
}

function KnowledgeParameter({
  projectId,
  gitRef,
  value,
  parameter,
  knowledge,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  parameter: ParameterYjs;
  knowledge: (Dataset['dataValues'] & {
    blockletDid?: string;
    from?: NonNullable<ExecuteBlock['tools']>[number]['from'];
  })[];
}) {
  const { t } = useLocaleContext();
  const { deleteUselessParameter } = useDelete(value);
  const localKnowledge = knowledge.filter((x) => !x.blockletDid);
  const resourceKnowledge = knowledge.filter((x) => x.blockletDid);

  const options = useMemo(() => {
    return [
      ...localKnowledge.map((item) => ({
        id: item.id,
        name: item.name || t('unnamed'),
        from: item.from,
        blockletDid: undefined,
        group: t('本地知识库'),
      })),
      ...(resourceKnowledge || []).map((item) => ({
        id: item.id,
        name: item.name || t('unnamed'),
        from: undefined,
        blockletDid: (item as any).blockletDid,
        group: t('资源知识库'),
      })),
    ];
  }, [localKnowledge, resourceKnowledge, t]);

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'knowledge') {
    const toolId = parameter?.source?.knowledge?.id;
    const blockletDid = parameter?.source?.knowledge?.blockletDid;
    const { source } = parameter;

    const parameters = [
      { name: 'searchAll', description: t('allContent'), type: 'boolean' },
      { name: 'message', description: t('searchContent') },
    ];
    const v = options.find((x) => x.id === toolId);
    const d = blockletDid ? options.find((x) => x.id === toolId && x.blockletDid === blockletDid) : null;

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('knowledge.menu')}</Typography>

          <Autocomplete
            value={d ?? v ?? null}
            multiple={false}
            groupBy={(option) => option.group || ''}
            options={options}
            renderInput={(params) => (
              <TextField hiddenLabel placeholder={t('selectKnowledgePlaceholder')} {...params} />
            )}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(o, v) => `${o.id}` === `${v.id}`}
            renderGroup={(params) => {
              return (
                <Box key={params.key}>
                  <Typography p={2} py={1} pl={1} lineHeight="20px" color="#9CA3AF">
                    {params.group}
                  </Typography>

                  <Box>{params.children}</Box>
                </Box>
              );
            }}
            onChange={(_, _value) => {
              if (_value) {
                // 删除历史自动添加的变量
                deleteUselessParameter();

                const parameters = {
                  message: '',
                };

                source.knowledge = {
                  from: 'knowledge',
                  id: _value.id,
                  blockletDid: _value.blockletDid,
                  parameters,
                };
              }
            }}
          />
        </Box>

        {source?.knowledge && (
          <Box>
            <Typography variant="subtitle2">{t('inputs')}</Typography>

            <Stack gap={1}>
              {(parameters || [])?.map((data) => {
                if (!data) return null;

                if (data.type === 'boolean') {
                  return (
                    <Stack key={data.name}>
                      <Typography variant="caption">{data.description || data.name}</Typography>

                      <Switch
                        checked={Boolean(source?.knowledge?.parameters?.[data.name] ?? false)}
                        onChange={(_, checked) => {
                          if (source?.knowledge?.parameters) {
                            // @ts-ignore
                            source.knowledge.parameters[data.name] = checked;
                          }
                        }}
                      />
                    </Stack>
                  );
                }

                if (source?.knowledge?.parameters?.searchAll) {
                  return null;
                }

                return (
                  <Stack key={data.name}>
                    <Typography variant="caption">{data.description || data.name}</Typography>

                    <PromptEditorField
                      placeholder={`{{ ${data.name} }}`}
                      value={source?.knowledge?.parameters?.[data.name] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={value}
                      path={[]}
                      onChange={(value) => {
                        if (source?.knowledge?.parameters) {
                          source.knowledge.parameters[data.name] = value;
                        }
                      }}
                    />
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  }

  return null;
}

function DatastoreParameter({
  projectId,
  gitRef,
  parameter,
}: {
  projectId: string;
  gitRef: string;
  parameter: ParameterYjs;
}) {
  const { t } = useLocaleContext();
  const { getVariables } = useProjectStore(projectId, gitRef);

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'datastore') {
    const { source } = parameter;
    const v = getVariables();

    const variables = v?.variables || [];
    const variable = variables.find(
      (x) => `${x.scope}_${x.key}` === `${source?.variable?.scope}_${source?.variable?.key}`
    );

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('memory.title')}</Typography>
          <Box>
            <SelectVariable
              placeholder={t('selectMemoryPlaceholder')}
              variables={variables}
              variable={variable}
              onChange={(_value) => {
                if (_value) source.variable = { key: _value.key, scope: _value.scope || '' };
              }}
            />
          </Box>
        </Box>
      </Stack>
    );
  }

  return null;
}

const filter = createFilterOptions<any>();

function checkKeyParameterIsUsed({ value, key }: { value: AssistantYjs; key: string }) {
  if (!key) {
    return false;
  }

  const parameters = Object.values(value?.parameters || {}).flatMap((x) => {
    if (x.data.type === 'source') {
      if (x.data.source?.variableFrom === 'tool') {
        return [Object.values(x.data.source?.agent?.parameters || {})];
      }

      if (x.data.source?.variableFrom === 'knowledge') {
        return [Object.values(x.data.source?.knowledge?.parameters || {})];
      }

      if (x.data.source?.variableFrom === 'blockletAPI') {
        return [Object.values(x.data.source?.api?.parameters || {})];
      }
    }

    return [];
  });

  return !!parameters.find((x) => {
    return (x || []).find((str) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`);
      return pattern.test(str);
    });
  });
}

const useDelete = (value: AssistantYjs) => {
  const { deleteParameter } = useVariablesEditorOptions(value);

  const deleteUselessParameter = () => {
    Object.values(value.parameters || {}).forEach((x) => {
      const list = [FROM_API_PARAMETER, FROM_PARAMETER, FROM_API_PARAMETER];
      if (x.data.from && list.includes(x.data.from) && !checkKeyParameterIsUsed({ value, key: x.data.key || '' })) {
        deleteParameter(x.data);
      }
    });
  };

  return {
    deleteUselessParameter,
  };
};

function SecretParameterView({ parameter }: { parameter: ParameterYjs }) {
  const { t } = useLocaleContext();

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'secret') {
    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('name')}</Typography>

          <TextField
            hiddenLabel
            fullWidth
            placeholder={t('inputParameterLabelPlaceholder')}
            value={parameter.label || ''}
            onChange={(e) => {
              parameter.label = e.target.value;
            }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('docLink')}</Typography>

          <TextField
            hiddenLabel
            fullWidth
            placeholder={t('inputParameterLinkPlaceholder')}
            value={parameter.docLink || ''}
            onChange={(e) => {
              parameter.docLink = e.target.value;
            }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('placeholder')}</Typography>

          <TextField
            hiddenLabel
            fullWidth
            placeholder={t('inputParameterPlaceholderPlaceholder')}
            value={parameter.placeholder || ''}
            onChange={(e) => {
              parameter.placeholder = e.target.value;
            }}
          />
        </Box>
      </Stack>
    );
  }

  return null;
}

function AgentParameter({ value, parameter }: { value: AssistantYjs; parameter: ParameterYjs }) {
  const { t } = useLocaleContext();
  const { deleteUselessParameter } = useDelete(value);

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'tool') {
    const agentId = parameter?.source?.agent?.id;
    const { source } = parameter;

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('chooseObject', { object: t('agent') })}</Typography>

          <AgentSelect
            type="tool"
            excludes={[value.id]}
            autoFocus
            disableClearable
            value={
              agentId
                ? {
                    id: agentId,
                    projectId: parameter.source.agent?.projectId,
                    blockletDid: parameter.source.agent?.blockletDid,
                  }
                : undefined
            }
            onChange={(_, v) => {
              if (v) {
                // 删除历史自动添加的变量
                deleteUselessParameter();

                source.agent = {
                  blockletDid: v.blockletDid,
                  projectId: v.projectId,
                  id: v.id,
                  from: 'assistant',
                };
              }
            }}
          />
        </Box>

        {agentId && <AgentParametersForm assistant={value} parameter={parameter as any} />}
      </Stack>
    );
  }

  return null;
}

function AgentParametersForm({
  assistant,
  parameter,
}: {
  assistant: AssistantYjs;
  parameter: ParameterYjs & { type: 'source'; source: { variableFrom: 'tool' } };
}) {
  if (!parameter.source?.agent?.id) throw new Error('Missing required parameter agent.id');

  const { t } = useLocaleContext();

  const agent = useAgent({
    type: 'tool',
    projectId: parameter.source.agent.projectId,
    agentId: parameter.source.agent.id,
  });
  const { projectId, projectRef } = useCurrentProject();

  if (!agent) return null;

  return (
    <Stack gap={2}>
      <AuthorizeButton agent={agent} />

      <Box>
        <Typography variant="subtitle2">{t('inputs')}</Typography>

        <Box>
          {agent.parameters?.map((data) => {
            if (!data?.key || data.type === 'source') return null;

            const placeholder = data.placeholder?.replace(/([^\w]?)$/, '');

            return (
              <Stack key={data.id}>
                <Typography variant="caption">{data.label || data.key}</Typography>

                <PromptEditorField
                  placeholder={`${placeholder ? `${placeholder}, ` : ''}default {{ ${data.key} }}`}
                  value={parameter.source.agent?.parameters?.[data.key] || ''}
                  projectId={projectId}
                  gitRef={projectRef}
                  assistant={assistant}
                  path={[]}
                  onChange={(value) => {
                    parameter.source.agent!.parameters ??= {};
                    parameter.source.agent!.parameters[data.key!] = value;
                  }}
                />
              </Stack>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}

export function AuthorizeButton({ agent }: { agent: NonNullable<ReturnType<typeof useAgent>> }) {
  const { t } = useLocaleContext();

  const authInputs = agent.parameters?.filter(
    (i) => i.key && i.type === 'source' && i.source?.variableFrom === 'secret'
  );

  const dialogState = usePopupState({ variant: 'dialog' });
  const { projectId } = useCurrentProject();

  const [authorized, setAuthorized] = useState(false);
  const { value: { secrets = [] } = {}, loading } = useAsync(
    () => getSecrets({ projectId, targetProjectId: agent.project.id, targetAgentId: agent.id }),
    [projectId, agent.project.id, agent.id]
  );

  const isAuthorized = secrets.length > 0 || authorized;

  if (!authInputs?.length || loading) return null;

  return (
    <Box>
      <Button variant={isAuthorized ? 'outlined' : 'contained'} fullWidth {...bindTrigger(dialogState)}>
        {t(isAuthorized ? 'reauthorize' : 'authorize')}
      </Button>
      <Stack direction="row" alignItems="center" gap={0.5} my={0.5}>
        <Box component={Icon} icon={InfoCircleIcon} color="text.secondary" />

        <Typography variant="caption" sx={{ flex: 1 }}>
          {t('authorizeApiKeyTip')}
        </Typography>
      </Stack>

      <AuthorizeParametersFormDialog
        agent={agent}
        maxWidth="sm"
        fullWidth
        onSuccess={() => {
          setAuthorized(true);
          dialogState.close();
        }}
        {...bindDialog(dialogState)}
      />
    </Box>
  );
}

function AuthorizeParametersFormDialog({
  agent,
  onSuccess,
  ...props
}: { agent: NonNullable<ReturnType<typeof useAgent>>; onSuccess?: () => void } & DialogProps) {
  const { t } = useLocaleContext();

  const authInputs = agent.parameters?.filter(
    (i) => i.key && i.type === 'source' && i.source?.variableFrom === 'secret'
  );

  const form = useForm();
  const { projectId } = useCurrentProject();

  const onSubmit = async (values: { [key: string]: string }) => {
    await createOrUpdateSecrets({
      input: {
        secrets: Object.entries(values).map(([key, secret]) => ({
          projectId,
          targetProjectId: agent.project.id,
          targetAgentId: agent.id,
          targetInputKey: key,
          secret,
        })),
      },
    });
    onSuccess?.();
  };

  return (
    <Dialog {...props} component="form" onSubmit={form.handleSubmit(onSubmit)}>
      <DialogTitle>
        {t('authorize')} - {agent.name}
      </DialogTitle>

      <DialogContent>
        <Stack gap={1}>
          {authInputs?.map((item, index) => (
            <Stack key={item.id}>
              <Typography variant="caption">
                {item.label || item.key} {item.docLink && <Link href={item.docLink}>{t('docLink')}</Link>}
              </Typography>

              <PasswordField
                autoFocus={index === 0}
                hiddenLabel
                fullWidth
                placeholder={item.placeholder}
                {...form.register(item.key!, { required: true })}
              />
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={(e) => props.onClose?.(e, 'backdropClick')}>
          {t('cancel')}
        </Button>

        <LoadingButton type="submit" variant="contained" loading={form.formState.isSubmitting}>
          {t('save')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

function PopperButton({
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
  openApis,
  onDelete,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  onDelete: () => void;
}) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  return (
    <>
      <Button sx={{ minWidth: 0, p: 0.5, ml: -0.5, cursor: 'pointer' }} {...bindTrigger(parameterSettingPopperState)}>
        <Box component={Icon} icon={DotsIcon} sx={{ color: '#3B82F6' }} />
      </Button>

      <Popper
        {...bindPopper(parameterSettingPopperState)}
        placement="bottom-end"
        sx={{ zIndex: (theme) => theme.zIndex.modal }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            parameterSettingPopperState.close();
          }}>
          <Paper sx={{ p: 0, minWidth: 140, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            <Stack gap={2}>
              <List>
                {!(parameter.from === FROM_PARAMETER || parameter.from === FROM_KNOWLEDGE_PARAMETER) && (
                  <MenuItem onClick={dialogState.open}>{t('setting')}</MenuItem>
                )}
                <MenuItem sx={{ color: '#E11D48', fontSize: 13 }} onClick={onDelete}>
                  {t('delete')}
                </MenuItem>
              </List>
            </Stack>
          </Paper>
        </ClickAwayListener>
      </Popper>

      <SelectFromSourceDialog
        dialogState={dialogState}
        knowledge={knowledge}
        openApis={openApis}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
      />
    </>
  );
}

function APIParameter({
  value,
  projectId,
  gitRef,
  parameter,
  openApis,
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  parameter: ParameterYjs;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
}) {
  const { t, locale } = useLocaleContext();
  const { deleteUselessParameter } = useDelete(value);

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'blockletAPI') {
    const agentId = parameter?.source?.api?.id;
    const { source } = parameter;

    const options = [
      ...openApis.map((dataset) => ({
        ...dataset,
        name:
          getDatasetTextByI18n(dataset, 'summary', locale) ||
          getDatasetTextByI18n(dataset, 'description', locale) ||
          t('unnamed'),
        parameters: getAllParameters(dataset),
        fromText: t('buildInData'),
      })),
    ];

    const option = openApis.find((x) => x.id === agentId);
    const parameters = option && getAllParameters(option);

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('chooseObject', { object: t('api') })}</Typography>

          <SelectTool
            placeholder={t('selectOpenAPIToCallPlaceholder')}
            options={options || []}
            multiple={false}
            value={options.find((x) => x.id === agentId)}
            onChange={(_value) => {
              if (_value) {
                // 删除历史自动添加的变量
                deleteUselessParameter();

                // 整理选择 agent 的参数
                source.api = {
                  id: _value.id,
                  parameters: (_value?.parameters || []).reduce((tol: any, cur: any) => {
                    if (cur.name) tol[cur.name] = '';
                    return tol;
                  }, {}),
                };
              }
            }}
            renderOption={(props, option) => {
              return (
                <MenuItem {...props} key={option.name}>
                  <Box>{option.name || t('unnamed')}</Box>
                  <Typography variant="subtitle5" ml={1}>
                    {(option.id || '').split(':')?.[0]}
                  </Typography>
                </MenuItem>
              );
            }}
          />
        </Box>

        {!!(parameters || []).length && (
          <Box>
            <Typography variant="subtitle2">{t('inputs')}</Typography>

            <Stack gap={1.5}>
              {(parameters || [])?.map((parameter) => {
                if (!parameter.name) return null;

                // @ts-ignore
                if (parameter['x-parameter-type'] === 'boolean') {
                  return (
                    <Stack key={parameter.name}>
                      <Box>
                        <FormControlLabel
                          sx={{
                            alignItems: 'flex-start',
                            '.MuiCheckbox-root': {
                              ml: -0.5,
                            },
                          }}
                          control={
                            <Switch
                              defaultChecked={Boolean(source?.api?.parameters?.[parameter.name] ?? false)}
                              onChange={(_, checked) => {
                                if (source?.api?.parameters) {
                                  // @ts-ignore
                                  source.api.parameters[parameter.name] = Boolean(checked);
                                }
                              }}
                            />
                          }
                          label={
                            <Typography variant="caption" mb={0.5}>
                              {getDatasetTextByI18n(parameter, 'description', locale) ||
                                getDatasetTextByI18n(parameter, 'name', locale)}
                            </Typography>
                          }
                          labelPlacement="top"
                        />
                      </Box>
                    </Stack>
                  );
                }

                return (
                  <Stack key={parameter.name}>
                    <Typography variant="caption" mb={0.5}>
                      {getDatasetTextByI18n(parameter, 'description', locale) ||
                        getDatasetTextByI18n(parameter, 'name', locale)}
                    </Typography>

                    <PromptEditorField
                      placeholder={`{{ ${parameter.name} }}`}
                      value={source?.api?.parameters?.[parameter.name] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={value}
                      path={[]}
                      onChange={(value) => {
                        if (source?.api?.parameters) {
                          source.api.parameters[parameter.name] = value;
                        }
                      }}
                    />
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  }

  return null;
}
