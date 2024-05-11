import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';
import React, { useEffect } from 'react';

import AddOutputVariableButton from './AddOutputVariableButton';
import OutputActionsCell from './OutputActionsCell';
import OutputDescriptionCell from './OutputDescriptionCell';
import OutputFormatCell from './OutputFormatCell';
import OutputNameCell from './OutputNameCell';
import { getRuntimeOutputVariable } from './type';

export default function OutputSettings({
  value,
  projectId,
  gitRef,
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();

  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');
  const groups = useSortedOutputs({ assistant: value });

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
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
                <Box component={TableCell} width="30%">
                  {t('name')}
                </Box>
                <Box component={TableCell}>{t('description')}</Box>
                <Box component={TableCell}>{t('format')}</Box>
                <Box component={TableCell} width={74}>
                  {t('required')}
                </Box>
                <Box component={TableCell} align="right" />
              </TableRow>
            </TableHead>

            <TableBody>
              {Object.entries(groups).map(
                ([group, outputs]) =>
                  outputs.length > 0 && (
                    <>
                      <tr key={`group-${group}`} className="group-header">
                        <td colSpan={5}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t(group)}
                          </Typography>
                        </td>
                      </tr>

                      {outputs.map((item) => (
                        <VariableRow
                          key={item.data.id}
                          variable={item.data}
                          value={value}
                          projectId={projectId}
                          gitRef={gitRef}
                          onRemove={() =>
                            setField(() => {
                              delete value.outputVariables?.[item.data.id];
                            })
                          }
                        />
                      ))}
                    </>
                  )
              )}
            </TableBody>
          </Table>
        </Box>

        <AddOutputVariableButton
          assistant={value}
          onSelect={({ name }) => {
            setField((vars) => {
              const exist = name ? outputVariables?.find((i) => i.data.name === name) : undefined;
              if (exist) {
                delete vars[exist.data.id];
              } else {
                const id = nanoid();
                vars[id] = { index: Object.values(vars).length, data: { id, name, type: 'string' } };
              }

              sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
            });
          }}
        />
      </Box>
    </Box>
  );
}

const outputGroups: { [key in RuntimeOutputVariable]?: { group: 'system' | 'appearance'; index: number } } = {
  [RuntimeOutputVariable.text]: { group: 'system', index: 0 },
  [RuntimeOutputVariable.images]: { group: 'system', index: 1 },
  [RuntimeOutputVariable.suggestedQuestions]: { group: 'system', index: 2 },
  [RuntimeOutputVariable.referenceLinks]: { group: 'system', index: 3 },
  [RuntimeOutputVariable.children]: { group: 'system', index: 4 },
  [RuntimeOutputVariable.appearancePage]: { group: 'appearance', index: 0 },
  [RuntimeOutputVariable.appearanceInput]: { group: 'appearance', index: 1 },
  [RuntimeOutputVariable.appearanceOutput]: { group: 'appearance', index: 2 },
  [RuntimeOutputVariable.share]: { group: 'appearance', index: 3 },
};

function useSortedOutputs({ assistant }: { assistant: AssistantYjs }) {
  const groups: { [key in 'system' | 'appearance' | 'custom']: { index: number; data: OutputVariableYjs }[] } = {
    system: [],
    appearance: [],
    custom: [],
  };

  const outputs = sortBy(
    Object.values(assistant.outputVariables ?? {}),
    (item) => outputGroups[item.data.name as RuntimeOutputVariable]?.index ?? item.index
  );
  for (const item of outputs) {
    const group = outputGroups[item.data.name as RuntimeOutputVariable]?.group || 'custom';
    groups[group].push(item);
  }

  return groups;
}

function VariableRow({
  parent,
  value,
  variable,
  depth = 0,
  onRemove,
  projectId,
  gitRef,
  disabled,
}: {
  parent?: OutputVariableYjs;
  value: AssistantYjs;
  variable: OutputVariableYjs;
  depth?: number;
  onRemove?: () => void;
  projectId: string;
  gitRef: string;
  disabled?: boolean;
}) {
  const doc = (getYjsValue(variable) as Map<any>).doc!;
  const runtimeVariable = getRuntimeOutputVariable(variable);

  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();

  const variables = (variableYjs?.variables || []).filter((x) => x.type?.type === variable.type);
  const datastoreVariable = variables.find((x) => {
    const j = variable?.variable ?? { scope: '', key: '' };
    return `${x.scope}_${x.key}` === `${j.scope}_${j.key}`;
  });

  const v = datastoreVariable?.type
    ? {
        ...datastoreVariable?.type,
        id: variable.id,
        name: variable.name,
        description: variable.description,
        required: variable.required,
      }
    : variable;

  return (
    <>
      <Box component={TableRow} key={variable.id}>
        <Box component={TableCell}>
          <Box sx={{ ml: depth }}>
            <OutputNameCell output={v} TextFieldProps={{ disabled: Boolean(disabled) || parent?.type === 'array' }} />
          </Box>
        </Box>
        <Box component={TableCell}>
          <OutputDescriptionCell assistant={value} output={v} TextFieldProps={{ disabled }} />
        </Box>
        <Box component={TableCell}>
          <OutputFormatCell output={variable} variable={datastoreVariable} TextFieldProps={{ disabled }} />
        </Box>
        <Box component={TableCell}>
          {!runtimeVariable && (
            <Switch
              size="small"
              disabled={Boolean(disabled)}
              checked={v.required || false}
              onChange={(_, checked) => {
                v.required = checked;
              }}
            />
          )}
        </Box>
        <Box component={TableCell} align="right">
          <OutputActionsCell
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

      {!runtimeVariable &&
        v.type === 'object' &&
        v.properties &&
        sortBy(Object.values(v.properties), 'index').map((property) => (
          <React.Fragment key={property.data.id}>
            <VariableRow
              parent={v}
              disabled={Boolean(variable.variable?.key || disabled)}
              value={value}
              variable={property.data}
              depth={depth + 1}
              projectId={projectId}
              gitRef={gitRef}
              onRemove={() => {
                doc.transact(() => {
                  if (!v.properties) return;
                  delete v.properties[property.data.id];
                  sortBy(Object.values(v.properties), 'index').forEach((item, index) => (item.index = index));
                });
              }}
            />
          </React.Fragment>
        ))}

      {!runtimeVariable && v.type === 'array' && v.element && (
        <VariableRow
          parent={v}
          disabled={Boolean(variable.variable?.key || disabled)}
          projectId={projectId}
          gitRef={gitRef}
          value={value}
          variable={v.element}
          depth={depth + 1}
        />
      )}
    </>
  );
}
