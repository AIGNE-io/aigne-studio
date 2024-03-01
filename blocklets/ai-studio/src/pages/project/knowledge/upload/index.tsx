import { Box, Stack, styled } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Left from '../../icons/left';
import Discussion from './discuss';

const components: { [keyof: string]: any } = {
  discussion: Discussion,
};

export default function KnowledgeUpload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  const Component = type ? components[type || ''] : null;

  return (
    <Stack overflow="hidden">
      <Box p={3} display="flex" alignItems="center" gap={1} sx={{ boxShadow: '0 2px 2px 0 rgba(29,28,35,.04)' }}>
        <LeftContainer sx={{ cursor: 'pointer' }} onClick={() => navigate(-1)} display="flex" alignItems="center">
          <Left sx={{ fontSize: '28px' }} />
        </LeftContainer>

        <LeftContainer>Add unit</LeftContainer>
      </Box>

      <Box flex={1} overflow="auto">
        {Component && <Component />}
      </Box>
    </Stack>
  );
}

const LeftContainer = styled(Box)`
  color: #000;
  font-size: 18px;
  line-height: 24px;
`;
