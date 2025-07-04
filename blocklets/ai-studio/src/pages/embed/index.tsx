import { AIForm, AIFormResult } from '@blocklet/ai-runtime/components';
import { Box, Grid } from '@mui/material';
import { Route, Routes, useParams, useSearchParams } from 'react-router-dom';

export default function EmbedRoutes() {
  return (
    <Routes>
      <Route path="/:projectId/:gitRef/:assistantId " element={<AIFormPage />} />
      {/* TODO: A beautiful 404 page */}
      <Route path="*" element={<Box sx={{
        textAlign: "center"
      }}>404</Box>} />
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
    <Box
      sx={{
        maxWidth: "lg",
        mx: "auto"
      }}>
      <Grid container spacing={2} sx={{
        height: "100%"
      }}>
        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Box sx={{
            p: 2
          }}>
            <AIForm identifier={identifier} />
          </Box>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <Box sx={{
            p: 2
          }}>
            <AIFormResult identifier={identifier} />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
