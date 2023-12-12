import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box } from '@mui/material';
import { useEffect } from 'react';

import CodeEditor from '../../template-form/code-editor';

export default function FunctionCodeEditor({ value, readOnly }: { value: FunctionAssistantYjs; readOnly?: boolean }) {
  useEffect(() => {
    if (!value.code) {
      value.code = `\
module.exports.default = async function(args) {
  console.log(args)
  return {
    // result
  }
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
