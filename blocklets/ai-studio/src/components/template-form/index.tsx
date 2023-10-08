import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Input, Stack, Typography, inputClasses, styled } from '@mui/material';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Template } from '../../../api/src/store/templates';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import Parameters from './parameters';
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
          <StyledInput
            fullWidth
            disableUnderline
            placeholder={t('unnamed')}
            value={value.name ?? ''}
            onChange={(e) => (value.name = e.target.value)}
            sx={{ fontSize: 18, fontWeight: 'bold' }}
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
          <StyledInput
            fullWidth
            disableUnderline
            placeholder="Description"
            value={value.description ?? ''}
            onChange={(e) => (value.description = e.target.value)}
            sx={{ fontSize: 14 }}
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
            renderInput={({ InputLabelProps, InputProps, ...params }) => (
              <StyledInput disableUnderline placeholder={`+ ${t('form.tag')}`} {...InputProps} {...params} />
            )}
            sx={{ [`.${inputClasses.root},.${inputClasses.root}.${inputClasses.focused}`]: { py: 0.5 } }}
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
          Prompts
        </Typography>

        <Box mb={2}>
          <Prompts projectId={projectId} gitRef={gitRef} value={value} />
        </Box>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ px: 1, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
          Parameters
        </Typography>

        <Box mb={2}>
          <Parameters form={value} />
        </Box>
      </Box>
    </Stack>
  );
}

const StyledInput = styled(Input)`
  border-radius: ${({ theme }) => theme.shape.borderRadius * 2}px;
  padding-left: ${({ theme }) => theme.spacing(1)};
  padding-right: ${({ theme }) => theme.spacing(1)};

  &.${inputClasses.focused} {
    background-color: ${({ theme }) => theme.palette.grey[100]};
    padding: ${({ theme }) => theme.spacing(0, 1)};
  }
`;
