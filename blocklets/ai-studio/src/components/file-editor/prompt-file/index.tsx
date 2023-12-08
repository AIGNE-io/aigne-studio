import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Button, Stack, Tooltip, Typography, alpha, styled } from '@mui/material';
import { DragSortItemContainer, DragSortListYjs } from 'src/components/drag-sort-list';
import Add from 'src/pages/project/icons/add';
import Eye from 'src/pages/project/icons/eye';
import EyeNo from 'src/pages/project/icons/eye-no';
import { usePromptsState } from 'src/pages/project/prompt-state';
import { AssistantYjs, nextTemplateId } from 'src/pages/project/yjs-state';

import { ExecuteBlockYjs, PromptFileYjs, PromptMessage } from '../../../../api/src/store/projects';
import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import ExecuteBlockForm from '../execute-block';
import OutputSettings from '../output-settings';
import ParametersTable from '../parameters-table';
import PromptEditorField from '../prompt-editor-field';
import RoleSelectField from './role-select';
import PromptAssistantSetting from './setting';

// TODO 放到theme中
const bgcolor = 'rgba(249, 250, 251, 1)';

export default function PromptFileEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: PromptFileYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { addPrompt, deletePrompt } = usePromptsState({ projectId, gitRef, templateId: value.id });

  return (
    <Stack gap={2} pb={10}>
      <Box sx={{ bgcolor, p: 1, borderRadius: 1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ bgcolor, py: 1, px: 2, borderRadius: 1 }}>
        <ParametersTable readOnly={disabled} value={value} />
      </Box>

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
              disabled={readOnly}
              list={value.prompts}
              renderItem={(prompt, _, params) => {
                const hidden = prompt.visibility === 'hidden';

                const children =
                  prompt.type === 'message' ? (
                    <PromptItemMessage
                      assistant={value}
                      value={prompt.data}
                      promptHidden={prompt.visibility === 'hidden'}
                    />
                  ) : (
                    <PromptItemExecuteBlock
                      assistant={value}
                      projectId={projectId}
                      gitRef={gitRef}
                      value={prompt.data}
                      promptHidden={prompt.visibility === 'hidden'}
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

          <Stack direction="row" gap={2}>
            <Button
              startIcon={<Add />}
              onClick={() => addPrompt({ type: 'message', data: { id: nextTemplateId(), role: 'user' } })}>
              {t('addObject', { object: t('promptMessage') })}
            </Button>
            <Button
              startIcon={<Add />}
              onClick={() => addPrompt({ type: 'executeBlock', data: { id: nextTemplateId() } })}>
              {t('addObject', { object: t('executeBlock') })}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <PromptAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <OutputSettings value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

function PromptItemMessage({
  assistant,
  value,
  promptHidden,
}: {
  assistant: AssistantYjs;
  value: PromptMessage;
  promptHidden?: boolean;
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
      }}>
      <Stack direction="row" alignItems="center" gap={1} p={1}>
        <Typography variant="subtitle2">{t('prompt')}</Typography>

        <RoleSelectField size="small" value={value.role} onChange={(e) => (value.role = e.target.value as any)} />
      </Stack>

      <StyledPromptEditor
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
}: {
  projectId: string;
  gitRef: string;
  value: ExecuteBlockYjs;
  assistant: AssistantYjs;
  promptHidden?: boolean;
}) {
  return (
    <ExecuteBlockForm
      assistant={assistant}
      projectId={projectId}
      gitRef={gitRef}
      value={value}
      sx={{
        borderColor: (theme) =>
          alpha(theme.palette.warning.main, promptHidden ? theme.palette.action.disabledOpacity : 1),
        '*': {
          color: promptHidden ? 'text.disabled' : undefined,
        },
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
