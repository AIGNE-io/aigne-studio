import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

import { TemplateYjs } from '../../../../api/src/store/projects';
import Next from '../../../components/template-form/next';
import { useTemplateCompare } from '../state';

export default function NextView({
  projectId,
  gitRef,
  template,
  compareValue,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  compareValue?: TemplateYjs;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();
  const { getDiffBackground } = useTemplateCompare({ value: template, compareValue, readOnly });

  return (
    <Stack
      sx={{
        '.MuiInputBase-root': {
          ...getDiffBackground('next'),
        },
      }}>
      <Typography
        variant="subtitle1"
        sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
        {t('next')}
      </Typography>

      <Box px={2}>
        <Next readOnly={readOnly} projectId={projectId} gitRef={gitRef} form={template} />
      </Box>
    </Stack>
  );
}
