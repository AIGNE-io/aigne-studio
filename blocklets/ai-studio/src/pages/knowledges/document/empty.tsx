import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

const EmptyDocuments = () => {
  const { t } = useLocaleContext();
  return (
    <Box
      className="center"
      sx={{
        flex: 1,
        height: 1
      }}>
      <Stack sx={{
        alignItems: "center"
      }}>
        <Typography variant="subtitle1">📚</Typography>
        <Typography
          variant="subtitle5"
          sx={{
            maxWidth: 170,
            textAlign: "center"
          }}>
          {t('knowledge.emptyDocuments')}
        </Typography>
      </Stack>
    </Box>
  );
};

export default EmptyDocuments;
