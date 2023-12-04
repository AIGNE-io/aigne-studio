import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { useEffect, useState } from 'react';

import { FunctionFile } from '../../../api/src/store/projects';
import { useReadOnly } from '../../contexts/session';
import CodeEditor from '../template-form/code-editor';

export default function FunctionForm({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: FunctionFile;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  const [key, setKey] = useState<number>();

  useEffect(() => {
    if (!value.code) {
      value.code = `\
export {
  name: '',
  description: '',
  main () {
  }
}
`;
      setKey(Date.now());
    }
  }, []);

  // TODO: get function name/description

  return (
    <Stack gap={0.5} pb={10}>
      <Box
        sx={{
          border: 2,
          borderColor: 'primary.main',
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
        }}>
        <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
          <TipsAndUpdatesRounded fontSize="small" color="primary" />

          <Typography variant="subtitle1">{t('function')}</Typography>
        </Stack>

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
            key={key || value.id}
            readOnly={readOnly}
            language="javascript"
            path="function.js"
            value={value.code}
            onChange={(code) => (value.code = code)}
          />
        </Box>
      </Box>

      <Box height="100vh" />
    </Stack>
  );
}
