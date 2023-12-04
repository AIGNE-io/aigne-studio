import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { useMonaco } from '@monaco-editor/react';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { useDeferredValue, useEffect, useState } from 'react';

import { ApiFile } from '../../../api/src/store/projects';
import { useReadOnly } from '../../contexts/session';
import CodeEditor from '../template-form/code-editor';

export default function ApiForm({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: ApiFile;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  const monaco = useMonaco();
  const [key, setKey] = useState<number>();

  useEffect(() => {
    if (!value.schema) {
      value.schema = `\
{
  "name": "",
  "description": "",
  "parameters": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
`;
      setKey(Date.now());
    }
  }, []);

  const deferredSchema = useDeferredValue(value.schema);

  useEffect(() => {
    try {
      const json = JSON.parse(deferredSchema!);
      if (typeof json.name === 'string') value.name = json.name;
      if (typeof json.description === 'string') value.description = json.description;
    } catch {
      // ignore JSON error
    }
  }, [deferredSchema]);

  useEffect(() => {
    if (!monaco) return;

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      schemas: [
        {
          uri: 'https://ai-studio.arcblock.io/functions/api.json',
          fileMatch: ['*.json'],
          schema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Function name',
                minLength: 1,
              },
              description: {
                type: 'string',
                description: 'What can this function do?',
                minLength: 1,
              },
              parameters: {
                type: 'object',
              },
            },
            additionalProperties: false,
            required: ['name', 'description', 'parameters'],
          },
        },
      ],
    });
  }, [monaco]);

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

          <Typography variant="subtitle1">{t('api')}</Typography>
        </Stack>

        <Box
          sx={{
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
            language="json"
            path="api.json"
            value={value.schema}
            onChange={(schema) => (value.schema = schema)}
          />
        </Box>
      </Box>
    </Stack>
  );
}
