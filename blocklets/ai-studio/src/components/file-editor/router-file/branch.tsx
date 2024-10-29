import 'react-querybuilder/dist/query-builder.scss';

import { useReadOnly } from '@app/contexts/session';
import { isValidInput } from '@app/libs/util';
import { useAssistantCompare } from '@app/pages/project/state';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RouterAssistantYjs, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PlusIcon from '@iconify-icons/tabler/plus';
import { InfoOutlined } from '@mui/icons-material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { QueryBuilderMaterial } from '@react-querybuilder/material';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import React, { useCallback, useMemo, useRef } from 'react';
import type { RuleGroupType } from 'react-querybuilder';
import { QueryBuilder } from 'react-querybuilder';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';
import ToolDialog, { StyledPromptEditor } from './dialog';

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

const getInputType = (type?: string) => {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'checkbox';

  return 'text';
};

export default function RouterAssistantBranchEditor({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
  isRemoteCompare,
}: {
  projectId: string;
  gitRef: string;
  value: RouterAssistantYjs;
  compareValue?: RouterAssistantYjs;
  disabled?: boolean;
  isRemoteCompare?: boolean;
}) {
  const toolForm = useRef<any>(null);
  const dialogState = usePopupState({ variant: 'dialog' });
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const setDefaultTool = useRef<any>(null);

  const parameters = useMemo(() => {
    return Object.values(value.parameters || {})
      .map((i) => i.data)
      .filter((x) => x.key);
  }, [value.parameters]);

  const fields = useMemo(() => {
    return parameters.map((i) => ({
      name: i.key!,
      label: i.label || i.key!,
      inputType: getInputType(i.type),
    }));
  }, [parameters]);

  const routes = useMemo(() => {
    return value.routes && sortBy(Object.entries(value.routes), ([, item]) => item.index);
  }, [value.routes]);

  return (
    <Stack gap={1.5}>
      <QueryBuilderMaterial>
        {(routes || []).map(([id, { data: item, index }]) => {
          return (
            <React.Fragment key={id}>
              <BranchItem
                getDiffBackground={getDiffBackground}
                projectId={projectId}
                gitRef={gitRef}
                assistant={value}
                readOnly={readOnly}
                index={index}
                item={item}
                fields={fields}
                onDelete={() => {
                  if (readOnly) return;
                  if (value.routes) {
                    delete value.routes[id];
                    sortBy(Object.values(value.routes), 'index').forEach((i, index) => (i.index = index));
                  }
                }}
                onEdit={() => {
                  if (readOnly) return;
                  toolForm.current?.form.reset(cloneDeep(item));
                  dialogState.open();
                }}
              />
            </React.Fragment>
          );
        })}
      </QueryBuilderMaterial>

      <Divider />

      {!!routes?.length && (
        <>
          <ElseBranchItem
            projectId={projectId}
            gitRef={gitRef}
            assistant={value}
            readOnly={readOnly}
            item={value.defaultTool}
            onAdd={() => {
              if (readOnly) return;
              toolForm.current?.form.reset({});

              setDefaultTool.current = true;
              dialogState.open();
            }}
            onEdit={() => {
              if (readOnly) return;
              if (value.defaultTool) {
                toolForm.current?.form.reset(cloneDeep(value.defaultTool));
              }

              setDefaultTool.current = true;
              dialogState.open();
            }}
          />
          <Divider />
        </>
      )}

      <Button
        variant="text"
        startIcon={<Box component={Icon} icon={PlusIcon} sx={{ fontSize: 14 }} />}
        onClick={() => {
          toolForm.current?.form.reset();
          dialogState.open();
        }}>
        {routes?.length ? 'ELIF' : 'IF'}
      </Button>

      <ToolDialog
        ref={toolForm}
        projectId={projectId}
        assistant={value}
        gitRef={gitRef}
        openApis={[]}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;

          if (setDefaultTool.current) {
            doc.transact(() => {
              value.defaultTool = tool;
            });
          } else {
            doc.transact(() => {
              value.routes ??= {};

              const old = value.routes[tool.id];

              value.routes[tool.id] = {
                index: old?.index ?? Math.max(-1, ...Object.values(value.routes).map((i) => i.index)) + 1,
                data: { ...tool, condition: initialQuery },
              };

              sortBy(Object.values(value.routes), 'index').forEach((tool, index) => (tool.index = index));
            });
          }

          setDefaultTool.current = false;
          dialogState.close();
        }}
      />
    </Stack>
  );
}

interface BranchItemProps {
  projectId: string;
  gitRef: string;
  assistant: RouterAssistantYjs;
  readOnly?: boolean;
  index: number;
  item?: NonNullable<RouterAssistantYjs['routes']>[number]['data'];
  fields: { name: string; label: string }[];
  onDelete?: () => void;
  onEdit?: () => void;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
}

export function BranchItem({
  projectId,
  gitRef,
  assistant,
  readOnly,
  index,
  item,
  fields,
  onDelete,
  onEdit,
  getDiffBackground,
}: BranchItemProps) {
  const { t } = useLocaleContext();

  const defaultOperators = useMemo(() => {
    return [
      { name: '=', value: '=', label: t('operators.equals') },
      { name: '!=', value: '!=', label: t('operators.doesNotEqual') },
      { name: '<', value: '<', label: t('operators.lessThan') },
      { name: '>', value: '>', label: t('operators.greaterThan') },
      { name: '<=', value: '<=', label: t('operators.lessThanOrEqual') },
      { name: '>=', value: '>=', label: t('operators.greaterThanOrEqual') },
      { name: 'contains', value: 'contains', label: t('operators.contains') },
      { name: 'beginsWith', value: 'beginsWith', label: t('operators.beginsWith') },
      { name: 'endsWith', value: 'endsWith', label: t('operators.endsWith') },
      { name: 'doesNotContain', value: 'doesNotContain', label: t('operators.doesNotContain') },
      { name: 'doesNotBeginWith', value: 'doesNotBeginWith', label: t('operators.doesNotBeginWith') },
      { name: 'doesNotEndWith', value: 'doesNotEndWith', label: t('operators.doesNotEndWith') },
      { name: 'null', value: 'null', label: t('operators.isNull') },
      { name: 'notNull', value: 'notNull', label: t('operators.isNotNull') },
    ];
  }, [t]);

  const defaultCombinators = useMemo(() => {
    return [
      { name: 'and', value: 'and', label: t('operators.and') },
      { name: 'or', value: 'or', label: t('operators.or') },
    ];
  }, [t]);

  const AddRuleButton = ({ handleOnClick }: { handleOnClick: (_e: React.MouseEvent) => void }) => (
    <Button
      onClick={handleOnClick}
      variant="outlined"
      sx={{ minHeight: 32, background: '#030712', color: '#fff', '&:hover': { background: '#030712' } }}>
      {t('decision.addRule')}
    </Button>
  );

  const condition = useMemo(() => (item?.condition ? cloneDeep(item.condition) : initialQuery), [item?.condition]);

  const handleQueryChange = useCallback(
    (newQuery: any) => {
      if (item) {
        item.condition = cloneDeep(newQuery);
      }
    },
    [item]
  );

  return (
    <Stack
      direction="row"
      gap={1.5}
      position="relative"
      sx={{
        backgroundColor: { ...getDiffBackground('prepareExecutes', `${assistant.id}.data.routes.${item?.id}`) },
        '&:hover': {
          '.action-delete': {
            display: 'flex',
          },
        },
      }}>
      <Stack width={50}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.primary',
            width: 35,
            fontSize: '1rem',
            fontWeight: 'bold',
          }}>
          {index === 0 ? 'IF' : 'ELIF'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}>
          {t('decision.case')} {index}
        </Typography>

        <IconButton
          size="small"
          onClick={onDelete}
          sx={{ position: 'absolute', right: 4, top: 4, display: 'none' }}
          className="action-delete">
          <DeleteOutlineIcon fontSize="small" sx={{ color: '#E11D48' }} />
        </IconButton>
      </Stack>

      {item && (
        <Stack
          flex={1}
          width={0}
          gap={1}
          sx={{
            p: 2,
            bgcolor: '#F9FAFB',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}>
          <QueryBuilderContainer>
            <QueryBuilder
              key={item.condition?.id}
              fields={fields}
              operators={defaultOperators}
              combinators={defaultCombinators}
              query={condition}
              onQueryChange={handleQueryChange}
              controlElements={{
                addRuleAction: AddRuleButton,
                addGroupAction: () => null,
                removeGroupAction: () => null,
                cloneGroupAction: () => null,
              }}
            />
          </QueryBuilderContainer>

          <AgentItemView
            projectId={projectId}
            gitRef={gitRef}
            agent={item}
            assistant={assistant}
            readOnly={readOnly}
            onEdit={() => onEdit?.()}
          />
        </Stack>
      )}
    </Stack>
  );
}

export function ElseBranchItem({
  projectId,
  gitRef,
  assistant,
  readOnly,
  item,
  onEdit,
  onAdd,
}: Omit<BranchItemProps, 'fields' | 'index' | 'onDelete' | 'getDiffBackground'> & { onAdd: () => void }) {
  const { t } = useLocaleContext();

  return (
    <Stack direction="row" gap={1.5} position="relative">
      <Stack width={50}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.primary',
            width: 35,
            fontSize: '1rem',
            fontWeight: 'bold',
          }}>
          ELSE
        </Typography>
      </Stack>

      <Stack
        flex={1}
        width={0}
        gap={1}
        sx={{
          p: 2,
          bgcolor: '#F9FAFB',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
        <QueryBuilderContainer>
          <Box className="ruleGroup">
            <Typography variant="subtitle5" color="text.secondary" mb={0}>
              {t('decision.elseDescription')}
            </Typography>
          </Box>
        </QueryBuilderContainer>

        {item ? (
          <AgentItemView
            projectId={projectId}
            gitRef={gitRef}
            agent={item}
            assistant={assistant}
            readOnly={readOnly}
            onEdit={() => onEdit?.()}
          />
        ) : (
          <Button variant="text" onClick={() => onAdd?.()}>
            {t('select')} Agent
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export function AgentItemView({
  projectId,
  gitRef,
  agent,
  assistant,
  readOnly,
  onEdit,
  ...props
}: {
  assistant: RouterAssistantYjs;
  projectId: string;
  gitRef: string;
  agent: Tool;
  readOnly?: boolean;
  onEdit: () => void;
} & StackProps) {
  const navigate = useNavigate();

  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const { addParameter } = useVariablesEditorOptions(assistant);

  const f = store.files[agent.id];
  const target = f && isAssistant(f) ? f : undefined;

  const parameters = useMemo(() => {
    return (
      target?.parameters &&
      sortBy(Object.values(target.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string; hidden?: boolean } } => !!i.data.key && !i.data.hidden
      )
    );
  }, [target]);

  const checkParametersInParameter = (key: string) => {
    const parameters =
      (assistant?.parameters &&
        sortBy(Object.values(assistant.parameters), (i) => i.index).filter((i) => !i.data.hidden)) ||
      [];
    return Boolean(parameters.find((i) => i.data.key === key));
  };

  if (!target) return null;
  const { name, description } = target;

  return (
    <Stack
      width={1}
      direction="row"
      {...props}
      sx={{
        position: 'relative',
        background: '#F9FAFB',
        py: 1,
        px: 1.5,
        minHeight: 40,
        gap: 1,
        alignItems: 'center',
        cursor: 'pointer',
        borderRadius: 1,
        border: '1px solid transparent',
        borderColor: 'primary.main',
        ':hover': {
          '.hover-visible': {
            display: 'flex',
          },
        },
      }}>
      <Stack width={1} gap={0.5}>
        <TextField
          onClick={(e) => e.stopPropagation()}
          hiddenLabel
          placeholder={name || t('unnamed')}
          size="small"
          variant="standard"
          value={name || t('unnamed')}
          InputProps={{ readOnly: true }}
          sx={{
            mb: 0,
            lineHeight: '20px',
            fontWeight: 500,
            input: {
              fontSize: '18px',
              color: 'primary.main',
            },
          }}
        />

        <TextField
          onClick={(e) => e.stopPropagation()}
          hiddenLabel
          placeholder={description || t('description')}
          size="small"
          variant="standard"
          value={description}
          onChange={(e) => (agent.functionName = e.target.value)}
          sx={{
            lineHeight: '10px',
            input: { fontSize: '10px', color: 'text.disabled' },
          }}
          inputProps={{ readOnly: true }}
        />

        <Box>
          <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
            <Stack justifyContent="space-between" direction="row" alignItems="center">
              <Typography variant="subtitle5" color="text.secondary" mb={0}>
                {t('parameters')}
              </Typography>

              <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
            </Stack>
          </Tooltip>

          <Stack gap={1}>
            {parameters?.map(({ data: parameter }: any) => {
              if (!parameter?.key) return null;
              if (!isValidInput(parameter)) return null;
              const className = `hover-visible-${parameter.key}`;

              return (
                <Stack
                  key={parameter.id}
                  sx={{
                    ':hover': { [`.${className}`]: { display: 'flex' } },
                  }}>
                  <Stack flexDirection="row" alignItems="center" mb={0.5}>
                    <Typography variant="caption" mx={1}>
                      {parameter.label || parameter.key}
                    </Typography>

                    {agent.parameters?.[parameter.key] || checkParametersInParameter(parameter.key) ? null : (
                      <Tooltip title={!agent.parameters?.[parameter.key] ? t('addParameter') : undefined}>
                        <Box
                          className={className}
                          component={Icon}
                          icon={PlusIcon}
                          sx={{ fontSize: 12, cursor: 'pointer', color: 'primary.main', display: 'none' }}
                          onClick={() => {
                            agent.parameters ??= {};
                            agent.parameters[parameter.key] = `{{${parameter.key}}}`;
                            addParameter(parameter.key);
                          }}
                        />
                      </Tooltip>
                    )}
                  </Stack>

                  <PromptEditorField
                    placeholder={`{{${parameter.label || parameter.key}}}`}
                    value={agent.parameters?.[parameter.key] || ''}
                    projectId={projectId}
                    gitRef={gitRef}
                    assistant={assistant}
                    path={[]}
                    onChange={(value) => {
                      agent.parameters ??= {};
                      if (parameter.key) agent.parameters[parameter.key] = value;
                    }}
                  />
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Stack>

      <Stack
        direction="row"
        className="hover-visible"
        sx={{ position: 'absolute', right: 10, top: 10, display: 'none' }}
        gap={0.5}
        flex={1}>
        <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onEdit}>
          <Box component={Icon} icon={PencilIcon} sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Button>

        {target && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(joinURL('.', `${target.id}.yaml`));
            }}>
            <Box component={Icon} icon={ExternalLinkIcon} sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

const QueryBuilderContainer = styled(Box)`
  .queryBuilder {
    min-width: 420px;
    width: 100%;
  }

  .MuiInputBase-input {
    margin-bottom: 0;
    padding: 0 10px;
    background-color: #fff;
  }

  .MuiInput-root {
    margin-top: 0 !important;
  }

  .ruleGroup {
    border: 0;
  }
`;
