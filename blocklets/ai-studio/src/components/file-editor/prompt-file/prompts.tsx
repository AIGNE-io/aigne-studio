import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ExecuteBlockYjs,
  PromptAssistantYjs,
  PromptMessage,
  nextAssistantId,
} from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CopyIcon from '@iconify-icons/tabler/copy';
import EyeIcon from '@iconify-icons/tabler/eye';
import EyeOffIcon from '@iconify-icons/tabler/eye-off';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Button, Stack, Tooltip, alpha, styled } from '@mui/material';
import { useAssistantCompare } from 'src/pages/project/state';

import { useReadOnly } from '../../../contexts/session';
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
  compareValue = undefined,
  disabled = undefined,
  isRemoteCompare = undefined,
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
      sx={{
        gap: 1,
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
                  className="prompt-item"
                  preview={params.preview}
                  drop={params.drop}
                  drag={params.drag}
                  disabled={readOnly}
                  isDragging={params.isDragging}
                  actions={
                    <>
                      <Tooltip
                        title={hidden ? t('activeMessageTip') : t('hideMessageTip')}
                        disableInteractive
                        placement="top">
                        <Button onClick={() => (prompt.visibility = hidden ? undefined : 'hidden')}>
                          {prompt.visibility === 'hidden' ? (
                            <Box component={Icon} icon={EyeOffIcon} sx={{ color: 'grey.500' }} />
                          ) : (
                            <Box component={Icon} icon={EyeIcon} sx={{ color: 'grey.500' }} />
                          )}
                        </Button>
                      </Tooltip>

                      <Tooltip title={t('copy')} disableInteractive placement="top">
                        <Button onClick={() => copePrompt(prompt, _)}>
                          <Box component={Icon} icon={CopyIcon} sx={{ color: 'grey.500' }} />
                        </Button>
                      </Tooltip>
                    </>
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
          <Stack
            direction="row"
            sx={{
              gap: 1.5,
            }}>
            <Button
              startIcon={<Box component={Icon} icon={PlusIcon} />}
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
  promptHidden = undefined,
  readOnly = undefined,
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
  backgroundColor?: Object;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        border: 1,
        borderColor: '#3B82F6',
        borderRadius: 1,
        '*': promptHidden ? { color: 'text.disabled' } : {},
        '.variable': promptHidden ? { color: 'rgba(0, 0, 0, 0.38) !important', fontWeight: 'normal !important' } : {},
        backgroundColor: promptHidden ? 'action.hover' : backgroundColor,
      }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1,
          p: 1,
          px: 1.5,
          borderBottom: '1px solid #BFDBFE',
        }}>
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
        data-testid="prompt-editor"
        placeholder={t('promptPlaceholder')}
        projectId={projectId}
        gitRef={gitRef}
        path={[value.id, 'content']}
        assistant={assistant}
        value={value.content}
        role={value.role}
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
  promptHidden = undefined,
  readOnly = undefined,
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

      // ':hover': {
      //   bgcolor: 'action.hover',
      // },

      // ':focus': {
      //   bgcolor: 'action.hover',
      // },
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
