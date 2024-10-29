import 'react-querybuilder/dist/query-builder.scss';

import { useReadOnly } from '@app/contexts/session';
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
import { useMemo, useRef } from 'react';
import type { RuleGroupType } from 'react-querybuilder';
import { QueryBuilder } from 'react-querybuilder';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';
import ToolDialog from './dialog';

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

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
  const fromDefaultTool = useRef<any>(null);

  const parameters = useMemo(() => {
    return Object.values(value.parameters || {})
      .map((i) => i.data)
      .filter((x) => x.key);
  }, [value.parameters]);

  const fields = useMemo(() => {
    return parameters.map((i) => ({
      name: i.key!,
      label: i.label || i.key!,
    }));
  }, [parameters]);

  const routes = value.routes && sortBy(Object.entries(value.routes), ([, item]) => item.index);

  console.log(JSON.stringify(value, null, 2));

  return (
    <Stack gap={1.5}>
      <QueryBuilderMaterial>
        {(routes || []).map(([id, { data: item, index }]) => {
          return (
            <BranchItem
              getDiffBackground={getDiffBackground}
              projectId={projectId}
              gitRef={gitRef}
              assistant={value}
              readOnly={readOnly}
              key={index}
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

              fromDefaultTool.current = true;
              dialogState.open();
            }}
            onEdit={() => {
              if (readOnly) return;
              if (value.defaultTool) {
                toolForm.current?.form.reset(cloneDeep(value.defaultTool));
              }

              fromDefaultTool.current = true;
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

          if (fromDefaultTool.current) {
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

          fromDefaultTool.current = false;
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
          CASE {index}
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
              fields={fields}
              query={cloneDeep(item.condition ?? initialQuery)}
              onQueryChange={(newQuery: any) => {
                item.condition = newQuery;
              }}
              controlElements={{
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
              用于定义当 if 条件不满足时应执行的逻辑。
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
            选择Agent
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
          // bgcolor: 'action.hover',
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
  .svg-font-color svg > path {
    fill: var(--ifm-font-color-base);
  }

  .queryBuilder {
    min-width: 420px;
    width: 100%;
  }

  .validateQuery .queryBuilder .ruleGroup.queryBuilder-invalid {
    background-color: rgba(102, 51, 153, 0.4);
  }
  .validateQuery .queryBuilder .ruleGroup.queryBuilder-invalid .ruleGroup-addRule {
    font-weight: bold !important;
  }
  .validateQuery .queryBuilder .ruleGroup.queryBuilder-invalid > .ruleGroup-header::after {
    content: 'Empty groups are considered invalid. Avoid them by using addRuleToNewGroups.';
    color: white;
  }
  .validateQuery .queryBuilder .rule.queryBuilder-invalid .rule-value {
    background-color: rgba(102, 51, 153, 0.4);
  }
  .validateQuery .queryBuilder .rule.queryBuilder-invalid .rule-value::placeholder {
    color: rgb(71.4, 35.7, 107.1);
  }

  html[data-theme='dark'] .validateQuery .queryBuilder .rule.queryBuilder-invalid .rule-value::placeholder {
    color: rgb(147.9, 94.35, 201.45);
  }

  .MuiInputBase-input {
    margin-bottom: 0;
    padding: 0 10px;
    background-color: #fff;
  }

  .MuiInput-root {
    margin-top: 0;
  }

  .ruleGroup {
    border: 0;
  }
`;
