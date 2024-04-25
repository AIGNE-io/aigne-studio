import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import Switch from '../custom/switch';
import SliderNumberField from '../slider-number-field';
import PromptEditorField from './prompt-editor-field';

export default function AssistantHistory({
  projectId,
  gitRef,
  value,
  compareValue,
  isRemoteCompare,
  readOnly,
}: {
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  compareValue?: AssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const setHistory = (update: (release: NonNullable<AssistantYjs['memory']>) => void) => {
    const doc = (getYjsValue(value) as Map<any>)?.doc!;

    doc.transact(() => {
      value.memory ??= {};
      update(value.memory);
    });
  };

  useEffect(() => {
    value.memory ??= {
      enable: false,
      limit: 50,
      keyword: '',
    };
  }, []);

  return (
    <Stack
      sx={{
        border: '1px solid #E5E7EB',
        p: '12px 16px',
        borderRadius: 1,
        backgroundColor: { ...getDiffBackground('history') },
      }}
      gap={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" mb={0}>
          {t('history.title')}
        </Typography>

        <Box>
          <Switch
            defaultChecked={value.memory?.enable ?? false}
            onChange={(_, checked) => setHistory((data) => (data.enable = checked ?? false))}
          />
        </Box>
      </Stack>

      {!!value.memory?.enable && (
        <>
          <Box className="between">
            <Typography variant="subtitle3" mb={0} flex={1}>
              {t('history.limit')}
            </Typography>

            <Box flex={1}>
              <SliderNumberField
                min={1}
                max={100}
                step={1}
                sx={{ flex: 1 }}
                value={value.memory?.limit ?? 50}
                onChange={(_, v) => setHistory((data) => (data.limit = v))}
              />
            </Box>
          </Box>

          <Box className="between">
            <Typography variant="subtitle3" mb={0} flex={1}>
              {t('history.keyword')}
            </Typography>

            <Box flex={1}>
              <PromptEditorField
                readOnly={readOnly}
                projectId={projectId}
                gitRef={gitRef}
                ContentProps={{ sx: { px: 1, py: 0.5 } }}
                path={[value.id, 'history']}
                assistant={value}
                value={value.memory?.keyword ?? ''}
                onChange={(prompt) => setHistory((data) => (data.keyword = prompt))}
              />
            </Box>
          </Box>
        </>
      )}
    </Stack>
  );
}
