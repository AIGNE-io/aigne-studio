import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, styled } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Left from '../../project/icons/left';
import Discussion from './discuss';
import File from './file';

const components: { [keyof: string]: any } = {
  discussion: Discussion,
  file: File,
};

export default function KnowledgeUpload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const { datasetId } = useParams();
  const { t } = useLocaleContext();

  const Component = type ? components[type || ''] : null;

  return (
    <Stack overflow="hidden">
      <Box p={3} display="flex" alignItems="center" gap={1} sx={{ boxShadow: '0 2px 2px 0 rgba(29,28,35,.04)' }}>
        <LeftContainer
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(`../${datasetId}`)}
          display="flex"
          alignItems="center">
          <Left sx={{ fontSize: '28px' }} />
        </LeftContainer>

        <LeftContainer>{t('knowledge.documents.add')}</LeftContainer>
      </Box>

      <Box flex={1} overflow="auto">
        {Component && <Component datasetId={datasetId} />}
      </Box>
    </Stack>
  );
}

const LeftContainer = styled(Box)`
  color: #000;
  font-size: 18px;
  line-height: 24px;
`;
