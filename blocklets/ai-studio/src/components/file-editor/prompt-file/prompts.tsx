import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ExecuteBlockYjs,
  PromptAssistantYjs,
  PromptMessage,
  nextAssistantId,
} from '@blocklet/ai-runtime/types';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Button, Stack, Tooltip, Typography, alpha, styled } from '@mui/material';
import { useAssistantCompare } from 'src/pages/project/state';

import { useReadOnly } from '../../../contexts/session';
import Add from '../../../pages/project/icons/add';
import Eye from '../../../pages/project/icons/eye';
import EyeNo from '../../../pages/project/icons/eye-no';
import { usePromptsState } from '../../../pages/project/prompt-state';
import { DragSortItemContainer, DragSortListYjs } from '../../drag-sort-list';
import ExecuteBlockForm from '../execute-block';
import PromptEditorField from '../prompt-editor-field';
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
  const { addPrompt, deletePrompt } = usePromptsState({ projectId, gitRef, templateId: value.id });

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  return (
    <Box
      sx={{
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
      }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />

        <Typography variant="subtitle1">{t('formatPrompt')}</Typography>
      </Stack>

      <Stack gap={2} p={2}>
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
                    <Tooltip
                      title={hidden ? t('activeMessageTip') : t('hideMessageTip')}
                      disableInteractive
                      placement="top">
                      <Button
                        sx={{
                          color: 'grey.500',
                          bgcolor: hidden ? 'action.selected' : undefined,
                        }}
                        onClick={() => (prompt.visibility = hidden ? undefined : 'hidden')}>
                        {prompt.visibility === 'hidden' ? (
                          <EyeNo sx={{ fontSize: '1.25rem' }} />
                        ) : (
                          <Eye sx={{ fontSize: '1.25rem' }} />
                        )}
                      </Button>
                    </Tooltip>
                  }
                  onDelete={() => deletePrompt({ promptId: prompt.data.id })}>
                  {children}
                </DragSortItemContainer>
              );
            }}
          />
        )}

        {!disabled && (
          <Stack direction="row" gap={2}>
            <Button
              startIcon={<Add />}
              onClick={() => addPrompt({ type: 'message', data: { id: nextAssistantId(), role: 'user' } })}>
              {t('addObject', { object: t('promptMessage') })}
            </Button>
            <Button
              startIcon={<Add />}
              onClick={() => addPrompt({ type: 'executeBlock', data: { id: nextAssistantId() } })}>
              {t('addObject', { object: t('executeBlock') })}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
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
        border: 2,
        borderColor: (theme) =>
          alpha(theme.palette.primary.main, promptHidden ? theme.palette.action.disabledOpacity : 1),
        borderRadius: 1,
        '*': {
          color: promptHidden ? 'text.disabled' : undefined,
        },
        backgroundColor,
      }}>
      <Stack direction="row" alignItems="center" gap={1} p={1}>
        <Typography variant="subtitle2">{t('prompt')}</Typography>

        <RoleSelectField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'role']}
          size="small"
          value={value.role}
          onChange={(e) => (value.role = e.target.value as any)}
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
      minHeight: 48,
      ...theme.typography.body1,
      bgcolor: 'transparent',

      ':hover': {
        bgcolor: 'action.hover',
      },

      ':focus': {
        bgcolor: 'action.hover',
      },
    },
  })
);
