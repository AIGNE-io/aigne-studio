import PopperMenu from '@app/components/menu/PopperMenu';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useAgents } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import { Box, BoxProps, MenuItem, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import jsonDiff from 'json-diff';
import { cloneDeep, sortBy } from 'lodash';
import React, { ComponentType, ReactNode, useEffect, useMemo, useRef } from 'react';

import { AgentName } from '../input/InputTable';
import useCallAgentOutput, { useCallAgentCustomOutputDialogState } from '../use-call-agent-output';
import OutputActionsCell, { PopperButtonImperative, SettingActionDialogProvider } from './OutputActionsCell';
import OutputAppearanceCell from './OutputAppearanceCell';
import OutputDescriptionCell from './OutputDescriptionCell';
import OutputFormatCell from './OutputFormatCell';
import OutputNameCell from './OutputNameCell';
import OutputRequiredCell from './OutputRequiredCell';
import { getRuntimeOutputVariable } from './type';

function findNameById(data: Record<string, any>, targetId?: string): any {
  if (!targetId) return undefined;

  if (data[targetId]?.data?.name) {
    return data[targetId].data;
  }

  for (const key in data) {
    const item = data[key];

    if (item?.data?.properties) {
      const result = findNameById(item.data.properties, targetId);
      if (result) return result;
    }

    // // 检查 element
    // if (item?.data?.element?.properties) {
    //   const result = findNameById(item.data.element.properties, targetId);
    //   if (result) return result;
    // }
  }

  return undefined;
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
  renderCustomColumn,
  onClickRow,
  isReadOnly = false,
  showArrayElement = true,
  showColumn = ['name', 'from', 'description', 'format', 'required', 'appearance', 'actions'],
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
  isReadOnly?: boolean;
  showColumn?: string[];
  showArrayElement?: boolean;
  renderCustomColumn?: (variable: OutputVariableYjs) => ReactNode;
  onClickRow?: (variable: OutputVariableYjs) => void;
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

  const checkMemoryVariableDefined = (output: OutputVariableYjs) => {
    if (output.variable) {
      const { variable } = output;
      if (variable && variable.key) {
        const variableYjs = getVariables();
        const found = variableYjs?.variables?.find((x) => x.key === variable.key && x.scope === variable.scope);

        return found?.type?.type === (output.type ?? 'string');
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

    if (!checkMemoryVariableDefined(variable)) {
      return 'rgba(255, 215, 213, 0.4) !important';
    }

    return 'transparent !important';
  }, [variable.hidden]);

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

  const open = () => {
    if (readOnly || variable.from?.type === 'variable') return;

    settingRef.current?.open();
  };

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
          title={!checkMemoryVariableDefined(variable) ? t('memoryNotDefined') : undefined}
          placement="top-start">
          <Box
            ref={rowRef}
            {...props}
            component={TableRow}
            key={variable.id}
            sx={{
              width: '100%',
              backgroundColor,
              '*': {
                color: Boolean(disabled || variable.hidden) ? 'text.disabled' : undefined,
              },
              cursor: readOnly ? 'not-allowed' : 'pointer',
              ...props.sx,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onClickRow) onClickRow?.(variable);
            }}>
            {renderCustomColumn?.(variable)}

            <TableCell onClick={open}>
              {firstColumnChildren}

              {showColumn?.includes('name') && (
                <Box sx={{ ml: depth === 0 ? depth : depth + 2 }}>
                  <OutputNameCell
                    data-testid="output-name-cell"
                    projectId={projectId}
                    gitRef={gitRef}
                    assistant={value}
                    depth={depth}
                    output={variable}
                    TextFieldProps={{
                      disabled: parent?.type === 'array' || readOnly,
                      InputProps: { readOnly: isReadOnly },
                      onClick: (e) => {
                        if (isReadOnly) return;
                        e.stopPropagation();
                      },
                    }}
                  />
                </Box>
              )}
            </TableCell>

            {showColumn?.includes('from') && (
              <TableCell>
                <OutputFromSelector
                  projectId={projectId}
                  gitRef={gitRef}
                  assistant={value}
                  output={variable}
                  openSettings={open}
                />
              </TableCell>
            )}

            {showColumn?.includes('description') && (
              <TableCell>
                <OutputDescriptionCell
                  data-testid="output-variable-description"
                  projectId={projectId}
                  gitRef={gitRef}
                  assistant={value}
                  output={variable}
                  TextFieldProps={{ disabled: readOnly }}
                />
              </TableCell>
            )}

            {showColumn?.includes('format') && (
              <TableCell onClick={open}>
                <OutputFormatCell
                  data-testid="output-variable-format"
                  assistant={value}
                  output={variable}
                  variable={datastoreVariable}
                  TextFieldProps={{ disabled: readOnly }}
                />
              </TableCell>
            )}

            {showColumn?.includes('required') && (
              <TableCell onClick={open}>
                <OutputRequiredCell data-testid="output-required-cell" output={variable} disabled={Boolean(disabled)} />
              </TableCell>
            )}

            {showColumn?.includes('appearance') && (
              <TableCell onClick={open}>
                <OutputAppearanceCell
                  data-testid="output-appearance-cell"
                  projectId={projectId}
                  gitRef={gitRef}
                  assistant={value}
                  output={variable}
                />
              </TableCell>
            )}

            {showColumn?.includes('actions') && (
              <TableCell align="right">
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
              </TableCell>
            )}
          </Box>
        </Tooltip>
      </SettingActionDialogProvider>

      {!runtimeVariable &&
        mergeVariable.type === 'object' &&
        mergeVariable.properties &&
        sortBy(Object.values(mergeVariable.properties), 'index').map((property) => (
          <React.Fragment key={property.data.id}>
            <VariableRow
              showArrayElement={showArrayElement}
              renderCustomColumn={renderCustomColumn}
              onClickRow={onClickRow}
              showColumn={showColumn}
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

      {!runtimeVariable && showArrayElement && mergeVariable.type === 'array' && mergeVariable.element && (
        <VariableRow
          renderCustomColumn={renderCustomColumn}
          showColumn={showColumn}
          onClickRow={onClickRow}
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

export const diffJSON = (found: OutputVariableYjs, v: OutputVariableYjs, t: any): string | undefined => {
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

function OutputFromSelector({
  output,
  openSettings,
  projectId,
  gitRef,
  assistant,
}: {
  output: OutputVariableYjs;
  openSettings?: () => void;
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
}) {
  const doc = (getYjsValue(output) as Map<any>).doc!;
  const current = OutputFromOptionsMap[output.from?.type || 'process'];
  const { onEdit } = useCallAgentCustomOutputDialogState(projectId, gitRef, assistant.id);
  const { t } = useLocaleContext();

  if (output.from?.type === 'variable' && assistant.type === 'callAgent') {
    const agents = assistant.agents && sortBy(Object.values(assistant.agents), (i) => i.index);
    const agentInstanceId = output.from?.agentInstanceId;
    const outputVariableId = output.from?.outputVariableId;

    if (agentInstanceId) {
      const data = agents?.find((i) => i.data.instanceId === agentInstanceId || i.data.id === agentInstanceId);
      // const agent = getFileById(data?.data.id!);
      const agent = useAgents({ type: 'tool' }).agentMap[data?.data.id!];
      const agentName = data?.data?.functionName ?? agent?.name;

      if (agent) {
        const outputVariable = findNameById(agent?.outputVariables || {}, outputVariableId);
        const outputVariableName = outputVariable
          ? getRuntimeOutputVariable(outputVariable)?.i18nKey
            ? t(getRuntimeOutputVariable(outputVariable)?.i18nKey || '')
            : outputVariable.name
          : '';

        return (
          <Box
            className="center"
            onClick={() =>
              onEdit?.(true, {
                id: output.id,
                agentInstanceId: agentInstanceId,
                outputVariableId: outputVariableId,
              })
            }
            sx={{
              maxWidth: 300,
              gap: 0.5,
              justifyContent: 'flex-start',
              color: 'action.disabled',
            }}>
            <Typography className="ellipsis">
              {outputVariableName
                ? t('agentSpecificOutput', { agentName, outputName: outputVariableName })
                : t('agentAllOutputs', { agentName })}
            </Typography>
            <Box
              component={Icon}
              icon={ChevronDownIcon}
              sx={{
                width: 15,
                mt: 0.3,
              }}
            />
          </Box>
        );
      }
    }

    return <Typography sx={{ color: 'text.disabled' }}>{t('notFoundAgent')}</Typography>;
  }

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
          <Box
            className="center"
            sx={{
              gap: 1,
              justifyContent: 'flex-start',
            }}>
            <Box>{current?.label && <current.label output={output} />}</Box>
            <Box
              component={Icon}
              icon={ChevronDownIcon}
              sx={{
                width: 15,
              }}
            />
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

export default VariableRow;
