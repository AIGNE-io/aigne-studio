import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

const EmptyDocuments = () => {
  const { t } = useLocaleContext();
  return (
    <Box className="center" flex={1} height={1}>
      <Stack alignItems="center">
        <Typography variant="subtitle1">📚</Typography>
        <Typography variant="subtitle5" maxWidth={170} textAlign="center">
          {t('knowledge.emptyDocuments')}
        </Typography>
      </Stack>
    </Box>
  );
};

export default EmptyDocuments;
