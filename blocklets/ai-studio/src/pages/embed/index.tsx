import { AIForm, AIFormResult } from '@blocklet/ai-runtime';
import { Box, Grid } from '@mui/material';
import { Route, Routes, useParams, useSearchParams } from 'react-router-dom';

export default function EmbedRoutes() {
  return (
    <Routes>
      <Route path="/:projectId/:gitRef/:assistantId " element={<AIFormPage />} />
      {/* TODO: A beautiful 404 page */}
      <Route path="*" element={<Box textAlign="center">404</Box>} />
    </Routes>
  );
}

function AIFormPage() {
  const { projectId, gitRef, assistantId } = useParams();
  if (!projectId || !gitRef || !assistantId) {
    throw new Error('Missing required params `projectId` or `gitRef` or `templateId`');
  }

  const [searchParams] = useSearchParams();
  const working = searchParams.get('working') === 'true';

  const identifier = { projectId, gitRef, assistantId, working };

  return (
    <Box maxWidth="lg" mx="auto">
      <Grid height="100%" container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box p={2}>
            <AIForm identifier={identifier} />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box p={2}>
            <AIFormResult identifier={identifier} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
