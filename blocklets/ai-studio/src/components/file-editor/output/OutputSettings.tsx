import { DragSortListYjs } from '@app/components/drag-sort-list';
import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { outputVariablesFromOpenApi } from '@blocklet/ai-runtime/types/runtime/schema';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { Icon } from '@iconify-icon/react';
import EyeIcon from '@iconify-icons/tabler/eye';
import EyeOffIcon from '@iconify-icons/tabler/eye-off';
import GripVertical from '@iconify-icons/tabler/grip-vertical';
import {
  Box,
  BoxProps,
  Button,
  Chip,
  Stack,
  Switch,
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
import React, { ComponentType, ReactNode, useEffect, useMemo } from 'react';

import AddOutputVariableButton from './AddOutputVariableButton';
import OutputActionsCell, { SettingActionDialogProvider } from './OutputActionsCell';
import OutputDescriptionCell from './OutputDescriptionCell';
import OutputFormatCell from './OutputFormatCell';
import OutputNameCell from './OutputNameCell';
import { getRuntimeOutputVariable } from './type';

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
                component={TableBody}
                list={value.outputVariables}
                sx={{ '&.isDragging .hover-visible': { display: 'none' } }}
                renderItem={(item, _, params) => (
                  <VariableRow
                    key={item.id}
                    rowRef={(ref) => params.drop(params.preview(ref))}
                    actionColumnChildren={
                      <Stack
                        direction="row"
                        className="hover-visible"
                        sx={{
                          p: 0.5,
                          gap: 0.25,
                          cursor: 'pointer',
                          button: {
                            p: 0.5,
                            minWidth: 0,
                            minHeight: 0,
                          },
                          display: 'none',
                        }}>
                        <Tooltip title={t('dragSort')} disableInteractive placement="top">
                          <Button ref={params.drag}>
                            <Box component={Icon} icon={GripVertical} sx={{ color: 'grey.500' }} />
                          </Button>
                        </Tooltip>

                        <Tooltip
                          title={item.hidden ? t('activeOutputTip') : t('hideOutputTip')}
                          disableInteractive
                          placement="top">
                          <Button onClick={() => (item.hidden = !item.hidden)}>
                            {item.hidden ? (
                              <Box component={Icon} icon={EyeOffIcon} sx={{ color: 'grey.500' }} />
                            ) : (
                              <Box component={Icon} icon={EyeIcon} sx={{ color: 'grey.500' }} />
                            )}
                          </Button>
                        </Tooltip>
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
                )}
              />
            )}
          </Table>
        </Box>

        <AddOutputVariableButton
          allSelectAgentOutputs={cloneDeep(allSelectAgentOutputs)}
          assistant={value}
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
  actionColumnChildren,
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
  actionColumnChildren?: ReactNode;
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
  const runtimeVariable = getRuntimeOutputVariable(variable);

  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();

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

    if (error) {
      return 'rgba(255, 215, 213, 0.4) !important';
    }

    return 'transparent !important';
  }, [error, variable.hidden]);

  return (
    <>
      <SettingActionDialogProvider
        depth={depth}
        disabled={disabled || variable.hidden}
        onRemove={onRemove}
        output={variable}
        variable={datastoreVariable}
        projectId={projectId}
        gitRef={gitRef}
        assistant={value}>
        <Tooltip title={error} placement="top-start">
          <Box
            ref={rowRef}
            {...props}
            component={TableRow}
            key={variable.id}
            sx={{
              backgroundColor,
              '*': {
                color: variable.hidden ? 'text.disabled' : undefined,
              },
              cursor: variable.hidden ? 'not-allowed' : 'pointer',
              ...props.sx,
            }}>
            <Box component={TableCell}>
              <Box sx={{ ml: depth === 0 ? depth : depth + 2 }}>
                <OutputNameCell
                  depth={depth}
                  output={variable}
                  TextFieldProps={{
                    disabled: Boolean(disabled) || parent?.type === 'array' || Boolean(variable.hidden),
                  }}
                />
              </Box>
            </Box>
            <Box component={TableCell}>
              <OutputDescriptionCell
                assistant={value}
                output={variable}
                TextFieldProps={{ disabled: Boolean(disabled) || Boolean(variable.hidden) }}
              />
            </Box>
            <Box component={TableCell}>
              <OutputFormatCell
                assistant={value}
                output={variable}
                variable={datastoreVariable}
                TextFieldProps={{ disabled: Boolean(disabled) || Boolean(variable.hidden) }}
              />
            </Box>
            <Box component={TableCell}>
              {!variable.hidden && !runtimeVariable && variable.from?.type !== 'input' && (
                <Switch
                  size="small"
                  disabled={Boolean(disabled)}
                  checked={variable.required || false}
                  onChange={(_, checked) => (variable.required = checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </Box>
            <Box component={TableCell}>
              {variable.appearance && (
                <Chip className="ellipsis" label={variable.appearance.componentName} size="small" />
              )}
            </Box>
            <Box component={TableCell} align="right" width={100} minWidth={100}>
              <Box display="flex" justifyContent="flex-end" gap={0.5} onClick={(e) => e.stopPropagation()}>
                {actionColumnChildren}

                <OutputActionsCell
                  depth={depth}
                  disabled={disabled || variable.hidden}
                  onRemove={onRemove}
                  output={variable}
                  variable={datastoreVariable}
                  projectId={projectId}
                  gitRef={gitRef}
                  assistant={value}
                />
              </Box>
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
      .filter((i): i is NonNullable<typeof i> => !!i);

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
            error = t('diffRouteName', { agentName: `${agent?.agent?.name} Agent`, routeName: found.name });
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
                  routeName: found.name,
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
                  routeName: found.name,
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
              .filter((i): i is NonNullable<typeof i> => !!i);

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

function Tag({ children, ...rest }: { children: any; [key: string]: any }) {
  return (
    <Box
      {...rest}
      sx={{
        borderRadius: '20px',
        fontWeight: 500,
        background: 'rgba(139,139,149,0.15)',
        color: 'rgba(75,74,88,1)',
        padding: '2px 8px',
        fontSize: '12px',
        height: '20px',
        lineHeight: '16px',
        cursor: 'pointer',
        maxWidth: 150,
        width: 'fit-content',
      }}>
      {children}
    </Box>
  );
}
