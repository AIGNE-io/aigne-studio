import { Box, CircularProgress } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import { useRequest } from 'ahooks';

function ObjectLazyTextViewer({ url }: { url: string }) {
  const { loading, data } = useRequest(() => {
    return fetch(url).then((res) => res.text());
  });

  if (loading) {
    return (
      <Box width={1} height={1} className="center">
        <CircularProgress />
      </Box>
    );
  }

  // if (data) return <iframe id="id12321" title="dummy" width="100%" height="800" frameBorder="0" src={url} />;

  return (
    <Box height={1} overflow="auto">
      <CodeMirror value={String(data)} editable={false} height="100%" />
    </Box>
  );
}

export default ObjectLazyTextViewer;
