import styled from '@emotion/styled';
import { Box } from '@mui/material';
import { useSize } from 'ahooks';
import { Suspense, lazy, useRef } from 'react';

const PdfComponent = lazy(() => import('@blocklet/pdf').then((module) => ({ default: module.PdfComponent })));

function ObjectLazyPDFViewer({ url }: { url: string }) {
  const containerRef = useRef(null);
  const size = useSize(containerRef);

  return (
    <Container height={1} overflow="hidden" ref={containerRef}>
      <Suspense fallback={null}>
        <Box sx={{ overflowY: 'hidden' }}>
          <PdfComponent url={url} maxHeight={size?.height || '70vh'} />
        </Box>
      </Suspense>
    </Container>
  );
}

const Container = styled(Box)``;

export default ObjectLazyPDFViewer;
