import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';
import React from 'react';

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

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

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

      <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5, overflow: 'auto' }}>
        <Box
          sx={{
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            table: {
              'th,td': { py: 0, px: 0, '&:not(:first-of-type)': { pl: 1 } },
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

            <TableBody
              sx={{
                'tr>td': {},
              }}>
              {outputVariables?.map((variable) => (
                <VariableRow
                  key={variable.data.id}
                  variable={variable.data}
                  value={value}
                  projectId={projectId}
                  gitRef={gitRef}
                  onRemove={() =>
                    setField(() => {
                      delete value.outputVariables?.[variable.data.id];
                    })
                  }
                />
              ))}
            </TableBody>
          </Table>
        </Box>

        {value.type !== 'image' && (
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
        )}
      </Box>
    </Box>
  );
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
