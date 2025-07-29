import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack, TextField, chipClasses, inputBaseClasses, inputClasses, styled } from '@mui/material';

import { useReadOnly } from '../../contexts/session';
import { useAssistantCompare } from '../../pages/project/state';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import TagsAutoComplete from '../template-form/tags-autocomplete';

export default function BasicInfoForm({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  compareValue?: AssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly });

  return (
    <Stack>
      <Box
        sx={{
          position: 'relative',
        }}>
        <WithAwareness indicator={false} projectId={projectId} gitRef={gitRef} path={[value.id, 'name']}>
          <Stack
            sx={{
              display: 'flex',
              flexDirection: 'row',
            }}>
            <HoverBackgroundTextField
              hiddenLabel
              fullWidth
              data-testid="agent-name"
              placeholder={t('unnamed')}
              value={value.name ?? ''}
              onChange={(e) => (value.name = e.target.value.replace(/\//g, ''))}
              InputProps={{
                readOnly,
                sx: (theme) => theme.typography.subtitle2,
              }}
              sx={{
                [`.${inputBaseClasses.root}`]: {
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: '28px',
                  color: '#030712',
                  ...getDiffBackground('name'),
                },
              }}
            />
          </Stack>
        </WithAwareness>

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'name']}
          sx={{ position: 'absolute', right: 0, top: 0 }}
        />
      </Box>
      <Box
        sx={{
          position: 'relative',
        }}>
        <WithAwareness indicator={false} projectId={projectId} gitRef={gitRef} path={[value.id, 'description']}>
          <HoverBackgroundTextField
            hiddenLabel
            fullWidth
            data-testid="agent-description"
            placeholder={t('agentDescriptionPlaceholder')}
            value={value.description ?? ''}
            multiline
            maxRows={6}
            onChange={(e) => (value.description = e.target.value)}
            InputProps={{ readOnly, sx: { color: 'text.secondary' } }}
            sx={{
              [`.${inputBaseClasses.root}`]: {
                fontSize: 14,
                fontWeight: 400,
                lineHeight: '24px',
                color: '#9CA3AF',
                ...getDiffBackground('description'),
              },
            }}
          />
        </WithAwareness>

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'description']}
          sx={{ position: 'absolute', right: 0, top: 0 }}
        />
      </Box>
      <Box
        sx={{
          position: 'relative',
        }}>
        <WithAwareness indicator={false} projectId={projectId} gitRef={gitRef} path={[value.id, 'tag']}>
          <TagsAutoComplete
            readOnly={readOnly}
            projectId={projectId}
            gitRef={gitRef}
            value={value.tags ?? []}
            onChange={(_, tags) => (value.tags = tags)}
            renderInput={(params) => (
              <HoverBackgroundTextField
                {...params}
                hiddenLabel
                placeholder={t('tag')}
                InputProps={{
                  ...params.InputProps,
                  sx: { color: 'text.secondary', [`.${chipClasses.root}`]: { ml: 0, mr: 0.5, my: 0.5 } },
                }}
                sx={{
                  [`.${inputBaseClasses.root}`]: {
                    ...getDiffBackground('tags'),
                  },
                }}
              />
            )}
          />
        </WithAwareness>

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'tag']}
          sx={{ position: 'absolute', right: 0, top: 0 }}
        />
      </Box>
    </Stack>
  );
}

const HoverBackgroundTextField = styled(TextField)(({ theme }) =>
  theme.unstable_sx({
    [`.${inputBaseClasses.root}`]: {
      bgcolor: 'transparent',

      [`:hover, &.${inputClasses.focused}`]: {
        bgcolor: 'action.hover',
      },
    },
  })
);
