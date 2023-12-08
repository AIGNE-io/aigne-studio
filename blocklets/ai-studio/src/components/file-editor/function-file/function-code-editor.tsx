import { Box } from '@mui/material';
import { FunctionFileYjs } from 'api/src/store/projects';
import { useEffect } from 'react';

import CodeEditor from '../../template-form/code-editor';

export default function FunctionCodeEditor({ value, readOnly }: { value: FunctionFileYjs; readOnly?: boolean }) {
  useEffect(() => {
    if (!value.code) {
      value.code = `\
export default function() {

}
`;
    }
  }, [value]);

  return (
    <Box
      sx={{
        zIndex: (theme) => theme.zIndex.tooltip,
        height: '50vh',
        '.monaco-editor': {
          borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 2,
          borderBottomRightRadius: (theme) => theme.shape.borderRadius * 2,
          '.overflow-guard': {
            borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 2,
            borderBottomRightRadius: (theme) => theme.shape.borderRadius * 2,
          },
        },
      }}>
      <CodeEditor
        readOnly={readOnly}
        language="javascript"
        path="function.js"
        value={value.code}
        onChange={(code) => (value.code = code)}
      />
    </Box>
  );
}
