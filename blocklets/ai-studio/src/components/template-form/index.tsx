import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, TextField, chipClasses, inputBaseClasses, inputClasses, styled } from '@mui/material';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Template } from '../../../api/src/store/templates';
import { useReadOnly } from '../../contexts/session';
import { useTemplateCompare } from '../../pages/project/state';
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
  disabled,
  compareValue,
}: {
  projectId: string;
  gitRef: string;
  value: TemplateYjs;
  disabled?: boolean;
  compareValue?: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useTemplateCompare({ value, compareValue, disabled });

  return (
    <Stack gap={0.5} pb={10}>
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
            sx={{
              '.MuiInputBase-root': {
                ...getDiffBackground('name'),
              },
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
            sx={{
              '.MuiInputBase-root': {
                ...getDiffBackground('description'),
              },
            }}
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
            readOnly={readOnly}
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
                  sx: {
                    color: 'text.secondary',
                    [`.${chipClasses.root}`]: { ml: 0, mr: 0.5 },
                  },
                }}
                sx={{
                  '.MuiInputBase-root': {
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
          sx={{ position: 'absolute', right: -16, top: 0 }}
        />
      </Box>

      <Prompts readOnly={readOnly} projectId={projectId} gitRef={gitRef} value={value} compareValue={compareValue} />
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
