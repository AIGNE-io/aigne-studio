import { DragSortListYjs } from '@app/components/drag-sort-list';
import PopperMenu from '@app/components/menu/PopperMenu';
import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { outputVariablesFromOpenApi } from '@blocklet/ai-runtime/types/runtime/schema';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { Icon } from '@iconify-icon/react';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import GripVertical from '@iconify-icons/tabler/grip-vertical';
import {
  Box,
  BoxProps,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import equal from 'fast-deep-equal';
import jsonDiff from 'json-diff';
import { cloneDeep, sortBy, uniqBy } from 'lodash';
import { nanoid } from 'nanoid';
import React, { ComponentType, ReactNode, useEffect, useMemo, useRef } from 'react';

import { AgentName } from '../input/InputTable';
import useCallAgentOutput from '../use-call-agent-output';
import AddOutputVariableButton from './AddOutputVariableButton';
import OutputActionsCell, { PopperButtonImperative, SettingActionDialogProvider } from './OutputActionsCell';
import OutputAppearanceCell from './OutputAppearanceCell';
import OutputDescriptionCell from './OutputDescriptionCell';
import OutputFormatCell from './OutputFormatCell';
import OutputNameCell from './OutputNameCell';
import OutputRequiredCell from './OutputRequiredCell';
import { getRuntimeOutputVariable } from './type';

const ignoredOutputVariables = new Set<string>([
  RuntimeOutputVariable.children,
  RuntimeOutputVariable.profile,
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.share,
  RuntimeOutputVariable.openingMessage,
  RuntimeOutputVariable.openingQuestions,
]);

export default function OutputSettings({
  value,
  projectId,
  gitRef,
  openApis = [],
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  openApis?: DatasetObject[];
}) {
  const { t } = useLocaleContext();

  const checkOutputVariables = useRoutesAssistantOutputs({ value, projectId, gitRef, openApis });
  const { getAllSelectCustomOutputs } = useAllSelectDecisionAgentOutputs({ value, projectId, gitRef });
  const allSelectAgentOutputs = getAllSelectCustomOutputs(openApis);
  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    const doc = (getYjsValue(value) as Map<any>).doc!;
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

  // Auto add text/images for old agents
  useEffect(() => {
    if (!outputVariables) {
      if (!value.type || value.type === 'prompt') {
        setField((outputs) => {
          const id = nanoid();
          outputs[id] = { index: 0, data: { id, name: RuntimeOutputVariable.text } };
        });
      }
      if (value.type === 'image') {
        setField((outputs) => {
          const id = nanoid();
          outputs[id] = { index: 0, data: { id, name: RuntimeOutputVariable.images } };
        });
      }
    }
  }, [value]);

  return (
    <Box sx={{ background: '#F9FAFB', py: 1.5, px: 2, pb: 2, borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box component={AigneLogoOutput} fontSize={14} />
          <Typography variant="subtitle2" mb={0}>
            {t('outputs')}
          </Typography>
        </Box>
      </Stack>

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
              'tr:not(.group-header):hover td': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
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
                <Box component={TableCell} width="30%">
                  {t('name')}
                </Box>
                <Box component={TableCell}>{t('from')}</Box>
                <Box component={TableCell}>{t('description')}</Box>
                <Box component={TableCell}>{t('format')}</Box>
                <Box component={TableCell} width={74}>
                  {t('required')}
                </Box>
                <Box component={TableCell} width={74}>
                  {t('appearance')}
                </Box>
                <Box component={TableCell} align="right" />
              </TableRow>
            </TableHead>

            {value.outputVariables && (
              <DragSortListYjs
                data-testid="output-table"
                component={TableBody}
                list={value.outputVariables}
                sx={{ '&.isDragging .hover-visible': { display: 'none' } }}
                renderItem={(item, _, params) =>
                  !ignoredOutputVariables.has(item.name as any) && (
                    <VariableRow
                      className="output-variable-row"
                      key={item.id}
                      rowRef={(ref) => params.drop(params.preview(ref))}
                      firstColumnChildren={
                        <Stack
                          className="hover-visible"
                          ref={params.drag}
                          sx={{
                            display: 'none',
                            p: 0.5,
                            cursor: 'move',
                            position: 'absolute',
                            left: -6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}>
                          <Box component={Icon} icon={GripVertical} sx={{ color: '#9CA3AF', fontSize: 14 }} />
                        </Stack>
                      }
                      sx={{
                        position: 'relative',
                        '&:hover .hover-visible': { display: 'flex' },
                      }}
                      // firstCellChildren
                      selectAgentOutputVariables={checkOutputVariables?.outputVariables || {}}
                      variable={item}
                      value={value}
                      projectId={projectId}
                      gitRef={gitRef}
                      onRemove={() =>
                        setField(() => {
                          delete value.outputVariables?.[item.id];
                        })
                      }
                    />
                  )
                }
              />
            )}
          </Table>
        </Box>

        <AddOutputVariableButton
          projectId={projectId}
          gitRef={gitRef}
          allSelectAgentOutputs={cloneDeep(allSelectAgentOutputs)}
          assistant={value}
          onDeleteSelect={({ id }) => {
            setField((vars) => {
              if (!id) return;
              if (!vars[id]) return;

              delete vars[id];
              sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
            });
          }}
          onSelect={({ name, from }) => {
            setField((vars) => {
              const exist = name ? outputVariables?.find((i) => i.data.name === name) : undefined;
              if (exist) {
                delete vars[exist.data.id];
              } else {
                const id = nanoid();
                vars[id] = { index: Object.values(vars).length, data: { id, name, from } };
              }

              sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
            });
          }}
          onSelectAll={(list) => {
            setField((vars) => {
              list.forEach((data) => {
                const exist = data.name ? outputVariables?.find((i) => i.data.name === data.name) : undefined;
                if (!exist) {
                  const id = nanoid();
                  vars[id] = {
                    index: Object.values(vars).length,
                    data: { ...cloneDeep(data), required: undefined, id },
                  };
                }

                sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
              });
            });
          }}
        />
      </Box>
    </Box>
  );
}

function VariableRow({
  firstColumnChildren,
  rowRef,
  selectAgentOutputVariables,
  parent,
  value,
  variable,
  depth = 0,
  onRemove,
  projectId,
  gitRef,
  disabled,
  ...props
}: {
  firstColumnChildren?: ReactNode;
  rowRef?: React.RefCallback<HTMLTableRowElement>;
  selectAgentOutputVariables?: AssistantYjs['outputVariables'];
  parent?: OutputVariableYjs;
  value: AssistantYjs;
  variable: OutputVariableYjs;
  depth?: number;
  onRemove?: () => void;
  projectId: string;
  gitRef: string;
  disabled?: boolean;
} & BoxProps<ComponentType<typeof TableRow>>) {
  const { t } = useLocaleContext();
  const runtimeVariable = getRuntimeOutputVariable(variable);

  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();
  const { outputs, getRefOutputData } = useCallAgentOutput({ projectId, gitRef, assistant: value });
  const refOutput = getRefOutputData((variable.from && 'id' in variable.from && variable.from.id) || '');

  const variables = (variableYjs?.variables || []).filter((x) => x.type?.type === (variable.type || 'string'));
  const datastoreVariable = variables.find((x) => {
    const j = variable?.variable ?? { scope: '', key: '' };
    return `${x.scope}_${x.key}` === `${j.scope}_${j.key}`;
  });

  const error = useCheckConflictAssistantOutputAndSelectAgents({
    selectAgentOutputVariables,
    value,
    v: variable,
    depth,
  });

  const checkMemoryVariableDefined = (output: OutputVariableYjs) => {
    if (output.variable) {
      const { variable } = output;
      if (variable && variable.key) {
        const variableYjs = getVariables();
        const found = variableYjs?.variables?.find((x) => x.key === variable.key && x.scope === variable.scope);

        return found?.type?.type === output.type;
      }
    }

    return true;
  };

  const mergeVariable = datastoreVariable?.type
    ? {
        ...datastoreVariable?.type,
        id: variable.id,
        name: variable.name,
        description: variable.description,
        required: variable.required,
      }
    : variable;

  const backgroundColor = useMemo(() => {
    if (variable.hidden) {
      return 'rgba(0, 0, 0, 0.04) !important';
    }

    if (error || !checkMemoryVariableDefined(variable)) {
      return 'rgba(255, 215, 213, 0.4) !important';
    }

    return 'transparent !important';
  }, [error, variable.hidden]);

  const readOnly = Boolean(disabled || variable.hidden || Boolean(variable.from?.type === 'output'));

  useEffect(() => {
    // 自动关联文本输出
    if (variable.from?.type === 'output') {
      if (variable.name === RuntimeOutputVariable.text) {
        const found = outputs.find((i) => i.name === RuntimeOutputVariable.text);
        if (found && variable.from?.id !== found.id) {
          variable.from.id = found.id;
          return;
        }
      }

      if (!refOutput) onRemove?.();
    }
  }, [outputs.map((x) => x.id).join(','), refOutput]);

  const settingRef = useRef<PopperButtonImperative>(null);

  if (variable.from?.type === 'output' && !refOutput) return null;

  return (
    <>
      <SettingActionDialogProvider
        popperRef={settingRef}
        depth={depth}
        disabled={readOnly}
        onRemove={onRemove}
        output={variable}
        variable={datastoreVariable}
        projectId={projectId}
        gitRef={gitRef}
        assistant={value}>
        <Tooltip
          title={error || !checkMemoryVariableDefined(variable) ? t('memoryNotDefined') : undefined}
          placement="top-start">
          <Box
            ref={rowRef}
            {...props}
            component={TableRow}
            key={variable.id}
            sx={{
              backgroundColor,
              '*': {
                color: Boolean(disabled || variable.hidden) ? 'text.disabled' : undefined,
              },
              cursor: readOnly ? 'not-allowed' : 'pointer',
              ...props.sx,
            }}>
            <Box component={TableCell} onClick={settingRef.current?.open}>
              {firstColumnChildren}

              <Box sx={{ ml: depth === 0 ? depth : depth + 2 }}>
                <OutputNameCell
                  data-testid="output-name-cell"
                  projectId={projectId}
                  gitRef={gitRef}
                  assistant={value}
                  depth={depth}
                  output={variable}
                  TextFieldProps={{ disabled: parent?.type === 'array' || readOnly }}
                />
              </Box>
            </Box>
            <Box component={TableCell}>
              <OutputFromSelector output={variable} openSettings={() => settingRef.current?.open()} />
            </Box>
            <Box component={TableCell}>
              <OutputDescriptionCell
                data-testid="output-variable-description"
                projectId={projectId}
                gitRef={gitRef}
                assistant={value}
                output={variable}
                TextFieldProps={{ disabled: readOnly }}
              />
            </Box>
            <Box component={TableCell} onClick={settingRef.current?.open}>
              <OutputFormatCell
                data-testid="output-variable-format"
                assistant={value}
                output={variable}
                variable={datastoreVariable}
                TextFieldProps={{ disabled: readOnly }}
              />
            </Box>
            <Box component={TableCell} onClick={settingRef.current?.open}>
              <OutputRequiredCell data-testid="output-required-cell" output={variable} disabled={Boolean(disabled)} />
            </Box>
            <Box component={TableCell} onClick={settingRef.current?.open}>
              <OutputAppearanceCell
                data-testid="output-appearance-cell"
                projectId={projectId}
                gitRef={gitRef}
                assistant={value}
                output={variable}
              />
            </Box>
            <Box component={TableCell} align="right">
              <OutputActionsCell
                data-testid="output-variable-actions"
                depth={depth}
                disabled={disabled}
                onRemove={onRemove}
                output={variable}
                variable={datastoreVariable}
                projectId={projectId}
                gitRef={gitRef}
                assistant={value}
              />
            </Box>
          </Box>
        </Tooltip>
      </SettingActionDialogProvider>

      {!runtimeVariable &&
        mergeVariable.type === 'object' &&
        mergeVariable.properties &&
        sortBy(Object.values(mergeVariable.properties), 'index').map((property) => (
          <React.Fragment key={property.data.id}>
            <VariableRow
              parent={mergeVariable}
              disabled={Boolean(variable.variable?.key || disabled)}
              value={value}
              variable={property.data}
              depth={depth + 1}
              projectId={projectId}
              gitRef={gitRef}
              onRemove={() => {
                const doc = (getYjsValue(variable) as Map<any>).doc!;
                doc.transact(() => {
                  if (!mergeVariable.properties) return;
                  delete mergeVariable.properties[property.data.id];
                  sortBy(Object.values(mergeVariable.properties), 'index').forEach(
                    (item, index) => (item.index = index)
                  );
                });
              }}
            />
          </React.Fragment>
        ))}

      {!runtimeVariable && mergeVariable.type === 'array' && mergeVariable.element && (
        <VariableRow
          parent={mergeVariable}
          disabled={Boolean(variable.variable?.key || disabled)}
          projectId={projectId}
          gitRef={gitRef}
          value={value}
          variable={mergeVariable.element}
          depth={depth + 1}
        />
      )}
    </>
  );
}

export const useAllSelectDecisionAgentOutputs = ({
  value,
  projectId,
  gitRef,
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
}) => {
  const { getFileById } = useProjectStore(projectId, gitRef);

  const getAllSelectCustomOutputs = (openApis: DatasetObject[]) => {
    if (value.type !== 'router') {
      return [];
    }

    const routes = Object.values(value?.routes || {}) || [];

    const list = routes.flatMap((x) => {
      if (x.data.from === 'blockletAPI') {
        const dataset = openApis.find((api) => api.id === x.data.id);
        if (dataset) {
          const properties = dataset?.responses?.['200']?.content?.['application/json']?.schema?.properties || {};
          const result = Object.entries(properties).map(([key, value]: any) => outputVariablesFromOpenApi(value, key));
          return result;
        }

        return [];
      }

      const agent = getFileById(x?.data?.id);
      if (!!agent && isAssistant(agent)) {
        const result = Object.values(agent?.outputVariables || {})
          .filter((x) => !(x?.data?.name || '').startsWith('$'))
          .map((x) => x.data);
        return result;
      }

      return [];
    });

    return uniqBy(list, 'name');
  };

  return { getAllSelectCustomOutputs };
};

export const useRoutesAssistantOutputs = ({
  value,
  projectId,
  gitRef,
  openApis = [],
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  openApis?: DatasetObject[];
}) => {
  const { getFileById } = useProjectStore(projectId, gitRef);
  const { t } = useLocaleContext();
  const { getAllSelectCustomOutputs } = useAllSelectDecisionAgentOutputs({ value, projectId, gitRef });
  const allSelectAgentOutputs = getAllSelectCustomOutputs(openApis);

  const agentAssistants = useMemo(() => {
    if (value.type !== 'router') {
      return [];
    }

    const routes = Object.values(value?.routes || {}) || [];
    const agentAssistants = routes
      .map((x) => {
        if (x.data.from === 'blockletAPI') {
          const dataset = openApis.find((api) => api.id === x.data.id);
          return {
            tool: x.data,
            agent: dataset,
          };
        }

        const i = getFileById(x?.data?.id);
        if (!!i && isAssistant(i) && Object.keys(i?.outputVariables || {}).length) {
          return {
            tool: x.data,
            agent: i,
          };
        }

        return null;
      })
      .filter(isNonNullable);

    return agentAssistants;
  }, [cloneDeep(value), projectId, gitRef, t]);

  const result = useMemo(() => {
    const list: AssistantYjs['outputVariables'] = {};

    if (!agentAssistants.length) {
      return null;
    }

    const getOutputVariables = (agent: Tool) => {
      if (agent.from === 'blockletAPI') {
        const dataset = openApis.find((api) => api.id === agent.id);
        if (dataset) {
          const properties = dataset?.responses?.['200']?.content?.['application/json']?.schema?.properties || {};
          const result = Object.entries(properties).map(([key, value]: any) => outputVariablesFromOpenApi(value, key));
          return result;
        }

        return [];
      }

      const i = getFileById(agent?.id);
      if (!!i && isAssistant(i) && Object.keys(i?.outputVariables || {}).length) {
        const result = Object.values(i?.outputVariables || {})
          .filter((x) => !(x?.data?.name || '').startsWith('$'))
          .map((x) => x.data);

        return result;
      }

      return [];
    };

    let error;
    for (const agent of agentAssistants) {
      const outputs = getOutputVariables(agent.tool);

      for (const output of outputs) {
        const currentList = Object.values(list || {})
          .filter((x) => !(x?.data?.name || '').startsWith('$'))
          .map((x) => x.data);
        const found = currentList.find((x) => x.name === output.name);

        if (found) {
          if (found.type && output.type && found.type !== output.type) {
            error = t('diffRouteName', { agentName: `${agent?.agent?.name} Agent`, routeName: found.name! });
            break;
          } else {
            if (found?.type === 'object' && output.type === 'object') {
              if (
                !equal(
                  cloneDeep(
                    Object.values(found?.properties || {}).map((x) => {
                      const { name, type, required } = x?.data || {};
                      return { name, type, required: required ?? false };
                    })
                  ),
                  cloneDeep(
                    Object.values(output?.properties || {}).map((x) => {
                      const { name, type, required } = x?.data || {};
                      return { name, type, required: required ?? false };
                    })
                  )
                )
              ) {
                error = t('diffRouteNameByType', {
                  agentName: `${agent?.agent?.name} Agent`,
                  routeName: found.name!,
                  type: 'object',
                });
                break;
              }
            }

            if (found?.type === 'array' && output.type === 'array') {
              if (
                !equal(
                  cloneDeep(
                    [found.element].map((x) => {
                      const { name, type, required } = x || {};
                      return { name, type, required: required ?? false };
                    })
                  ),
                  cloneDeep(
                    [output?.element].map((x) => {
                      const { name, type, required } = x || {};
                      return { name, type, required: required ?? false };
                    })
                  )
                )
              ) {
                error = t('diffRouteNameByType', {
                  agentName: `${agent?.agent?.name} Agent`,
                  routeName: found.name!,
                  type: 'array',
                });
                break;
              }
            }

            const filterRequired = agentAssistants
              .map((agent) => {
                const outputs = getOutputVariables(agent.tool);
                return outputs.find((x) => x.name === found.name);
              })
              .filter(isNonNullable);

            if (filterRequired.length === agentAssistants.length && filterRequired.every((x) => x.required)) {
              found.required = true;
            }
          }
        } else {
          const id = nanoid();
          list[id] = {
            index: 0,
            data: { ...cloneDeep(output), id, required: undefined, variable: undefined, initialValue: undefined },
          };
        }
      }
    }

    sortBy(Object.values(list || {}), 'index').forEach((item, index) => (item.index = index));

    return {
      outputVariables: list,
      error,
    };
  }, [cloneDeep(agentAssistants), allSelectAgentOutputs, projectId, gitRef, t]);

  return result;
};

const diffJSON = (found: OutputVariableYjs, v: OutputVariableYjs, t: any): string | undefined => {
  const result = jsonDiff.diff(cloneDeep(found), cloneDeep(v));
  if (result?.type) {
    return t('diffOutputType', { name: v.name, type: found.type });
  }

  if (result?.required) {
    // _old 为true时，不用判断
    if (!result?.required?.__old) {
      // 数据可能为 undefined
      if ((result?.required?.__old ?? false) !== (result?.required?.__new ?? false)) {
        return found.required
          ? t('requiredOutputParams', { name: v.name })
          : t('notRequiredOutputParams', { name: v.name });
      }
    }
  }

  if (result?.required__added) {
    return t('notRequiredOutputParams', { name: v.name });
  }

  if (found?.type === 'object' && v.type === 'object') {
    const object = Object.values(v?.properties || {})
      .map((data) => {
        if (data?.data) {
          const outputs = Object.values(found?.properties || {}).map((x) => x.data);

          const found1 = outputs.find((x) => x.name === data?.data?.name);
          if (!found1) {
            return t('notFoundOutputKeyFromSelectAgents', {
              name: data?.data?.name,
              outputNames: outputs.map((x) => x.name).join(','),
            });
          }

          return diffJSON(cloneDeep(found1 || {}), cloneDeep(data?.data || {}), t);
        }

        return undefined;
      })
      .filter((x) => x);

    return object[0];
  }

  if (found?.type === 'array' && v.type === 'array') {
    return diffJSON(
      cloneDeep(found?.element || {}) as OutputVariableYjs,
      cloneDeep(v?.element || {}) as OutputVariableYjs,
      t
    );
  }

  return undefined;
};

const useCheckConflictAssistantOutputAndSelectAgents = ({
  value,
  depth,
  v,
  selectAgentOutputVariables,
}: {
  selectAgentOutputVariables?: AssistantYjs['outputVariables'];
  value: AssistantYjs;
  v: OutputVariableYjs;
  depth?: number;
}) => {
  const { t } = useLocaleContext();

  const result = useMemo(() => {
    if (value.type !== 'router') {
      return undefined;
    }

    if (depth !== 0) {
      return undefined;
    }

    if (!v.name) {
      return undefined;
    }

    // 系统数据对比
    if (v.name.startsWith('$')) {
      return undefined;
    }

    // 自定义数据对比
    const outputs = Object.values(selectAgentOutputVariables || {})
      .map((x) => x.data)
      .filter((x) => !x.name?.startsWith('$'));

    const found = outputs.find((x) => x.name === v.name);
    if (!found) {
      return t('notFoundOutputKeyFromSelectAgents', {
        name: v.name,
        outputNames: outputs.map((x) => x.name).join(','),
      });
    }

    return diffJSON(cloneDeep(found || {}), cloneDeep(v || {}), t);
  }, [value.type, depth, cloneDeep(v), selectAgentOutputVariables, t]);

  return result;
};

const OutputFromOptions = [
  { value: 'process', label: () => 'Process', hidden: false },
  { value: 'input', label: () => 'Input', hidden: true },
  { value: 'output', label: () => 'Output', hidden: true },
  {
    value: 'callAgent',
    label: ({ output }: { output: OutputVariableYjs }) => {
      const a = output.from?.type === 'callAgent' ? output.from.callAgent : undefined;

      if (!a?.agentId) return 'Call Agent';

      return (
        <Box component="span">
          Call&nbsp;
          <AgentName {...a} agentId={a.agentId} type="tool" />
        </Box>
      );
    },
    hidden: false,
  },
] as const;

const OutputFromOptionsMap = Object.fromEntries(OutputFromOptions.map((x) => [x.value, x]));

function OutputFromSelector({ output, openSettings }: { output: OutputVariableYjs; openSettings?: () => void }) {
  const doc = (getYjsValue(output) as Map<any>).doc!;
  const current = OutputFromOptionsMap[output.from?.type || 'process'];

  return (
    <PopperMenu
      ButtonProps={{
        variant: 'text',
        sx: {
          my: 1,
          p: 0,
          cursor: 'pointer',
          color: output.hidden ? 'text.disabled' : 'text.primary',
          fontWeight: 400,
          ':hover': {
            backgroundColor: 'transparent',
          },
        },
        disabled: output.hidden || current?.hidden,
        children: (
          <Box className="center" gap={1} justifyContent="flex-start">
            <Box>{current?.label && <current.label output={output} />}</Box>
            <Box component={Icon} icon={ChevronDownIcon} width={15} />
          </Box>
        ),
      }}>
      {OutputFromOptions.map(
        (option) =>
          !option.hidden && (
            <MenuItem
              key={option.value}
              selected={option.value === current?.value}
              onClick={() => {
                if (current?.value === option.value) return;
                doc.transact(() => {
                  output.from ??= {};
                  output.from.type = option.value === 'process' ? undefined : option.value;
                });
                if (option.value === 'callAgent') openSettings?.();
              }}>
              <option.label output={output} />
            </MenuItem>
          )
      )}
    </PopperMenu>
  );
}
