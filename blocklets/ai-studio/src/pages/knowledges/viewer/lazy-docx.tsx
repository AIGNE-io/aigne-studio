import styled from '@emotion/styled';
import { Box, CircularProgress } from '@mui/material';
import { Suspense, useEffect, useRef, useState } from 'react';

function ObjectLazyDocxViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    const renderDocx = async () => {
      try {
        // Remove previous content div if it exists
        if (contentRef.current) {
          contentRef.current.remove();
        }

        // Create new content div
        const contentDiv = document.createElement('div');
        contentRef.current = contentDiv;
        container?.appendChild(contentDiv);

        const { renderAsync } = await import('docx-preview');

        if (url) {
          const response = await fetch(url);
          const blob = await response.blob();
          await renderAsync(blob, contentDiv);
        }
      } catch (error) {
        console.error('Error rendering DOCX:', error);
      } finally {
        setLoading(false);
      }
    };

    renderDocx();

    return () => {
      // Clean up by removing the content div
      contentRef.current?.remove();
      contentRef.current = null;
    };
  }, [url]);

  return (
    <Container
      height={1}
      overflow="auto"
      ref={containerRef}
      sx={{
        '.docx-wrapper': {
          background: 'rgb(251, 251, 251)',
        },
      }}>
      <Suspense fallback={null}>
        {loading ? (
          <Box
            className="center"
            sx={{
              width: 1,
              height: 1,
            }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowY: 'auto' }} />
        )}
      </Suspense>
    </Container>
  );
}

const Container = styled(Box)``;

export default ObjectLazyDocxViewer;
