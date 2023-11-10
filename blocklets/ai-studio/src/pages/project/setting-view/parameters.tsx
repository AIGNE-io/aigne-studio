import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

import { TemplateYjs } from '../../../../api/src/store/projects';
import Parameters from '../../../components/template-form/parameters';

export default function VariableView({
  template,
  compareValue,
  readOnly,
}: {
  template: TemplateYjs;
  compareValue?: TemplateYjs;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack>
      <Typography
        variant="subtitle1"
        sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
        {t('variable')}
      </Typography>

      <Box px={2}>
        <Parameters readOnly={readOnly} form={template} compareValue={compareValue} />
      </Box>
    </Stack>
  );
}
