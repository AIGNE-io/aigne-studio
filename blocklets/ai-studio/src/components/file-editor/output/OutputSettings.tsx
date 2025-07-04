import { DragSortListYjs } from '@app/components/drag-sort-list';
import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, RuntimeOutputVariable, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { outputVariablesFromOpenApi } from '@blocklet/ai-runtime/types/runtime/schema';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { Icon } from '@iconify-icon/react';
import GripVertical from '@iconify-icons/tabler/grip-vertical';
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import equal from 'fast-deep-equal';
import { cloneDeep, sortBy, uniqBy } from 'lodash';
import { nanoid } from 'nanoid';
import { useEffect, useMemo } from 'react';

import { useCallAgentCustomOutputDialogState } from '../use-call-agent-output';
import AddOutputVariableButton from './AddOutputVariableButton';
import { SelectAgentOutputDialog } from './CallAgentCustomOutput';
import VariableRow from './VariableRow';

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
  const { state, onOpen } = useCallAgentCustomOutputDialogState(projectId, gitRef, value.id);

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
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5
          }}>
          <Box component={AigneLogoOutput} sx={{
            fontSize: 14
          }} />
          <Typography variant="subtitle2" sx={{
            mb: 0
          }}>
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
                <Box component={TableCell} sx={{
                  width: "30%"
                }}>
                  {t('name')}
                </Box>
                <Box component={TableCell}>{t('from')}</Box>
                <Box component={TableCell}>{t('description')}</Box>
                <Box component={TableCell}>{t('format')}</Box>
                <Box component={TableCell} sx={{
                  width: 74
                }}>
                  {t('required')}
                </Box>
                <Box component={TableCell} sx={{
                  width: 74
                }}>
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

        {value.type === 'callAgent' && (
          <SelectAgentOutputDialog
            projectId={projectId}
            gitRef={gitRef}
            open={Boolean(state.open)}
            onClose={() => onOpen(false)}
            assistant={value}
            onConfirm={(data) => {
              setField((vars) => {
                const id = nanoid();

                if (data.id && vars[data.id]) {
                  if (vars[data.id]?.data.from) {
                    vars[data.id]!.data.from = {
                      type: 'variable',
                      agentInstanceId: data?.agentInstanceId,
                      outputVariableId: data?.outputVariableId,
                    };
                  }
                } else {
                  vars[id] = {
                    index: vars[id]?.index ?? Object.values(vars).length,
                    data: {
                      id,
                      name: data?.name || '',
                      from: {
                        type: 'variable',
                        agentInstanceId: data?.agentInstanceId,
                        outputVariableId: data?.outputVariableId,
                      },
                    },
                  };
                }

                sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
              });
            }}
          />
        )}
      </Box>
    </Box>
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
