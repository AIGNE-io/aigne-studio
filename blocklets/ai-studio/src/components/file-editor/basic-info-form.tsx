import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, TextField, chipClasses, inputBaseClasses, inputClasses, styled } from '@mui/material';
import { AssistantYjs } from 'src/pages/project/yjs-state';

import { useReadOnly } from '../../contexts/session';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import TagsAutoComplete from '../template-form/tags-autocomplete';

export default function BasicInfoForm({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: Pick<AssistantYjs, 'id' | 'name' | 'description' | 'tags'>;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack gap={0.5}>
      <Box position="relative">
        <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'name']}>
          <HoverBackgroundTextField
            hiddenLabel
            fullWidth
            placeholder={t('unnamed')}
            value={value.name ?? ''}
            onChange={(e) => (value.name = e.target.value)}
            InputProps={{
              readOnly,
              sx: (theme) => theme.typography.subtitle1,
            }}
          />
        </WithAwareness>

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'name']}
          sx={{ position: 'absolute', right: -16, top: 0 }}
        />
      </Box>

      <Box position="relative">
        <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'description']}>
          <HoverBackgroundTextField
            hiddenLabel
            fullWidth
            placeholder={t('description')}
            value={value.description ?? ''}
            multiline
            maxRows={6}
            onChange={(e) => (value.description = e.target.value)}
            InputProps={{ readOnly, sx: { color: 'text.secondary' } }}
          />
        </WithAwareness>

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'description']}
          sx={{ position: 'absolute', right: -16, top: 0 }}
        />
      </Box>

      <Box position="relative">
        <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'tag']}>
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
                placeholder={t('form.tag')}
                InputProps={{
                  ...params.InputProps,
                  sx: {
                    color: 'text.secondary',
                    [`.${chipClasses.root}`]: { ml: 0, mr: 0.5 },
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
          sx={{ position: 'absolute', right: -16, top: 0 }}
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
