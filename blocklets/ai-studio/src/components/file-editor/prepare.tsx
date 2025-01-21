import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { ApiAssistantYjs, FunctionAssistantYjs, ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { nextAssistantId } from '@blocklet/ai-runtime/types';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Button, Stack, Typography } from '@mui/material';

import { useReadOnly } from '../../contexts/session';
import PrepareExecuteList from './prepare-execute-list';

export default function Prepare({
  projectId,
  gitRef,
  value,
  disabled,
  compareValue,
  isRemoteCompare,
}: {
  projectId: string;
  gitRef: string;
  value: FunctionAssistantYjs | ApiAssistantYjs | ImageAssistantYjs;
  disabled?: boolean;
  compareValue?: FunctionAssistantYjs | ApiAssistantYjs | ImageAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack
      gap={1}
      sx={{
        borderRadius: 1,
        bgcolor: '#EDE9FE',
        px: 2,
        py: 1.5,
      }}>
      <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
        <Box component={Icon} icon="tabler:bule" sx={{ color: '#7C3AED', fontSize: 15 }} />
        <Typography variant="subtitle2" sx={{ m: 0 }}>
          {t('prepareExecutes')}
        </Typography>
      </Stack>

      {value.prepareExecutes && Object.values(value.prepareExecutes).length ? (
        <Stack gap={2}>
          <PrepareExecuteList
            assistant={value}
            projectId={projectId}
            gitRef={gitRef}
            value={value.prepareExecutes}
            readOnly={readOnly}
            compareAssistant={compareValue}
            isRemoteCompare={isRemoteCompare}
          />
        </Stack>
      ) : null}

      {!readOnly && (
        <Stack direction="row" gap={1.5}>
          <Button
            sx={{ color: '#6D28D9' }}
            startIcon={<Box component={Icon} icon={PlusIcon} />}
            onClick={() => {
              const doc = (getYjsValue(value) as Map<any>).doc!;
              doc.transact(() => {
                const id = nextAssistantId();
                value.prepareExecutes ??= {};
                value.prepareExecutes[id] = {
                  index: Math.max(-1, ...Object.values(value.prepareExecutes).map((i) => i.index)) + 1,
                  data: { id, selectType: 'all' },
                };
              });
            }}>
            {t('executeBlock')}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
