import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ExecuteBlockYjs,
  PromptAssistantYjs,
  PromptMessage,
  nextAssistantId,
} from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box, Button, Stack, Tooltip, alpha, styled } from '@mui/material';
import { useAssistantCompare } from 'src/pages/project/state';

import { useReadOnly } from '../../../contexts/session';
import Add from '../../../pages/project/icons/add';
import { usePromptsState } from '../../../pages/project/prompt-state';
import { DragSortItemContainer, DragSortListYjs } from '../../drag-sort-list';
import ExecuteBlockForm from '../execute-block';
import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';
import RoleSelectField from './role-select';

export default function PromptPrompts({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
  isRemoteCompare,
}: {
  projectId: string;
  gitRef: string;
  value: PromptAssistantYjs;
  compareValue?: PromptAssistantYjs;
  disabled?: boolean;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { addPrompt, copePrompt, deletePrompt } = usePromptsState({ projectId, gitRef, templateId: value.id });
  const { removeParameter } = useVariablesEditorOptions(value);
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  return (
    <Stack
      gap={1}
      sx={{
        borderRadius: 1,
        bgcolor: '#EFF6FF',
      }}>
      <>
        {value.prompts && (
          <DragSortListYjs
            sx={{ gap: 2 }}
            component={Stack}
            disabled={readOnly}
            list={value.prompts}
            renderItem={(prompt, _, params) => {
              const hidden = prompt.visibility === 'hidden';

              const children =
                prompt.type === 'message' ? (
                  <PromptItemMessage
                    readOnly={readOnly}
                    assistant={value}
                    projectId={projectId}
                    gitRef={gitRef}
                    value={prompt.data}
                    promptHidden={prompt.visibility === 'hidden'}
                    backgroundColor={getDiffBackground('prompts', prompt.data.id)}
                  />
                ) : (
                  <PromptItemExecuteBlock
                    readOnly={readOnly}
                    assistant={value}
                    projectId={projectId}
                    gitRef={gitRef}
                    value={prompt.data}
                    promptHidden={prompt.visibility === 'hidden'}
                    backgroundColor={getDiffBackground('prompts', prompt.data.id)}
                  />
                );

              return (
                <DragSortItemContainer
                  preview={params.preview}
                  drop={params.drop}
                  drag={params.drag}
                  disabled={readOnly}
                  isDragging={params.isDragging}
                  actions={
                    <Stack sx={{ gap: 1.5 }}>
                      <Tooltip
                        title={hidden ? t('activeMessageTip') : t('hideMessageTip')}
                        disableInteractive
                        placement="top">
                        <Box onClick={() => (prompt.visibility = hidden ? undefined : 'hidden')} className="center">
                          {prompt.visibility === 'hidden' ? (
                            <Box component={Icon} icon="tabler:eye-off" sx={{ color: 'grey.500' }} />
                          ) : (
                            <Box component={Icon} icon="tabler:eye" sx={{ color: 'grey.500' }} />
                          )}
                        </Box>
                      </Tooltip>

                      <Tooltip title={t('copy')} disableInteractive placement="top">
                        <Box onClick={() => copePrompt(prompt, _)} className="center">
                          <Box component={Icon} icon="tabler:copy" sx={{ color: 'grey.500' }} />
                        </Box>
                      </Tooltip>
                    </Stack>
                  }
                  onDelete={() => {
                    if ((prompt.data as any)?.type === 'dataset') {
                      removeParameter('datasetId');
                    }

                    deletePrompt({ promptId: prompt.data.id });
                  }}>
                  {children}
                </DragSortItemContainer>
              );
            }}
          />
        )}

        {!disabled && (
          <Stack direction="row" gap={1.5}>
            <Button
              startIcon={<Add />}
              onClick={() => addPrompt({ type: 'message', data: { id: nextAssistantId(), role: 'user' } })}>
              {t('promptMessage')}
            </Button>
          </Stack>
        )}
      </>
    </Stack>
  );
}

function PromptItemMessage({
  assistant,
  value,
  promptHidden,
  readOnly,
  projectId,
  gitRef,
  backgroundColor = {},
}: {
  assistant: AssistantYjs;
  value: PromptMessage;
  projectId: string;
  gitRef: string;
  promptHidden?: boolean;
  readOnly?: boolean;
  backgroundColor: Object;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        border: 1,
        borderColor: '#3B82F6',
        borderRadius: 1,
        '*': {
          color: promptHidden ? 'text.disabled' : undefined,
        },
        backgroundColor,
      }}>
      <Stack direction="row" alignItems="center" gap={1} p={1} px={1.5} borderBottom="1px solid #BFDBFE">
        <RoleSelectField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'role']}
          size="small"
          value={value.role}
          onChange={(e) => (value.role = e.target.value as any)}
          boxProps={{
            sx: {
              '.MuiInputBase-root': {
                ml: -1,
                background: 'transparent',
                '&:hover': {
                  background: 'transparent',
                },
                '&:focus': {
                  background: 'transparent',
                },
              },
              '&:focus-within': {
                background: 'transparent',
              },
              '.Mui-focused': {
                background: 'transparent',
              },
            },
          }}
        />
      </Stack>

      <StyledPromptEditor
        readOnly={readOnly}
        placeholder={t('promptPlaceholder')}
        projectId={projectId}
        gitRef={gitRef}
        path={[value.id, 'content']}
        assistant={assistant}
        value={value.content}
        onChange={(content) => (value.content = content)}
        ContentProps={{
          sx: {
            '&:hover': {
              bgcolor: 'transparent !important',
            },
          },
        }}
      />
    </Stack>
  );
}

function PromptItemExecuteBlock({
  projectId,
  gitRef,
  value,
  assistant,
  promptHidden,
  readOnly,
  backgroundColor,
}: {
  projectId: string;
  gitRef: string;
  value: ExecuteBlockYjs;
  assistant: AssistantYjs;
  promptHidden?: boolean;
  readOnly?: boolean;
  backgroundColor: Object;
}) {
  return (
    <ExecuteBlockForm
      assistant={assistant}
      projectId={projectId}
      gitRef={gitRef}
      path={[assistant.id, 'prompts', value.id]}
      value={value}
      readOnly={readOnly}
      sx={{
        borderColor: (theme) =>
          alpha(theme.palette.warning.main, promptHidden ? theme.palette.action.disabledOpacity : 1),
        '*': {
          color: promptHidden ? 'text.disabled' : undefined,
        },
        backgroundColor,
      }}
    />
  );
}

const StyledPromptEditor = styled(PromptEditorField)(({ theme }) =>
  theme.unstable_sx({
    p: 0,
    '.ContentEditable__root': {
      p: 1,
      px: 1.5,
      minHeight: 64,
      ...theme.typography.body1,
      bgcolor: 'transparent',

      ':hover': {
        bgcolor: 'action.hover',
      },

      ':focus': {
        bgcolor: 'action.hover',
      },
    },

    '.Placeholder__root': {
      top: '8px',
      left: '12px',
      bottom: 'inherit',
      fontSize: '14px',
      lineHeight: '24px',
    },
  })
);
