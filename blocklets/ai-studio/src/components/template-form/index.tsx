import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, TextField, Typography, inputBaseClasses, inputClasses, styled } from '@mui/material';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Template } from '../../../api/src/store/templates';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import Prompts from './prompts';
import TagsAutoComplete from './tags-autocomplete';

export type TemplateForm = Pick<
  Template,
  | 'id'
  | 'mode'
  | 'type'
  | 'name'
  | 'icon'
  | 'tags'
  | 'description'
  | 'prompts'
  | 'branch'
  | 'parameters'
  | 'datasets'
  | 'next'
>;

export default function TemplateFormView({
  projectId,
  gitRef,
  value,
}: {
  projectId: string;
  gitRef: string;
  value: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack>
      <Box position="relative">
        <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'name']}>
          <HoverBackgroundTextField
            hiddenLabel
            fullWidth
            placeholder={t('unnamed')}
            value={value.name ?? ''}
            onChange={(e) => (value.name = e.target.value)}
            InputProps={{ sx: { fontSize: 18 } }}
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
            onChange={(e) => (value.description = e.target.value)}
            InputProps={{ sx: { fontSize: 14 } }}
          />
        </WithAwareness>

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, 'description']}
          sx={{ position: 'absolute', right: -16, top: 0 }}
        />
      </Box>

      <Box mb={2} position="relative">
        <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'tag']}>
          <TagsAutoComplete
            projectId={projectId}
            value={value.tags ?? []}
            onChange={(_, tags) => (value.tags = tags)}
            renderInput={(params) => (
              <HoverBackgroundTextField
                {...params}
                hiddenLabel
                placeholder={t('form.tag')}
                InputProps={{
                  ...params.InputProps,
                  sx: { fontSize: 14, [`.${inputBaseClasses.input}`]: { py: 0 } },
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

      <Box>
        <Typography variant="h6" sx={{ px: 1, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          {t('prompts')}
        </Typography>

        <Box mb={2}>
          <Prompts projectId={projectId} gitRef={gitRef} value={value} />
        </Box>
      </Box>
    </Stack>
  );
}

const HoverBackgroundTextField = styled(TextField)(({ theme }) =>
  theme.unstable_sx({
    [`.${inputBaseClasses.root}`]: {
      bgcolor: 'transparent',

      [`&.${inputClasses.focused}`]: {
        bgcolor: 'rgba(0,0,0,0.06)',
      },
    },
  })
);
