import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs, nextAssistantId } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Button, Stack, Typography } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import Add from '../../../pages/project/icons/add';
import PrepareExecuteList from '../prepare-execute-list';

export default function ImageAssistantEditorPrepare({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: ImageAssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="subtitle1">{t('prepareExecutes')}</Typography>

        {!disabled && (
          <Button
            sx={{ minWidth: 32, minHeight: 32, p: 0 }}
            onClick={() => {
              const doc = (getYjsValue(value) as Map<any>).doc!;
              doc.transact(() => {
                const id = nextAssistantId();
                value.prepareExecutes ??= {};
                value.prepareExecutes[id] = {
                  index: Math.max(-1, ...Object.values(value.prepareExecutes).map((i) => i.index)) + 1,
                  data: { id },
                };
              });
            }}>
            <Add />
          </Button>
        )}
      </Stack>

      {value.prepareExecutes && Object.values(value.prepareExecutes).length ? (
        <Stack gap={2}>
          <PrepareExecuteList
            assistant={value}
            projectId={projectId}
            gitRef={gitRef}
            value={value.prepareExecutes}
            readOnly={readOnly}
          />
        </Stack>
      ) : (
        <Box textAlign="center">
          <Typography variant="caption" color="text.disabled">
            You haven't added any prepare execute blocks yet.
          </Typography>
        </Box>
      )}
    </>
  );
}
