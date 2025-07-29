import AigneLogoInput from '@app/icons/aigne-logo-input';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Stack, Typography } from '@mui/material';
import { isEmpty } from 'lodash';

import AddInputButton from './AddInputButton';
import InputTable from './InputTable';

export const FROM_PARAMETER = 'agentParameter';
export const FROM_KNOWLEDGE_PARAMETER = 'knowledgeParameter';

export default function InputSettings({
  value,
  readOnly,
  projectId,
  gitRef,
  compareValue,
  isRemoteCompare,
  openApis,
}: {
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  compareValue?: AssistantYjs;
  isRemoteCompare?: boolean;
  openApis?: DatasetObject[];
}) {
  const { t } = useLocaleContext();

  const noInputs = isEmpty(value.parameters);

  return (
    <Box
      data-testid="input-settings"
      sx={{
        background: '#F9FAFB',
        py: 1.5,
        px: 2,
        borderRadius: 1,
        pb: 2,
      }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}>
          <Box
            component={AigneLogoInput}
            sx={{
              fontSize: 14,
            }}
          />

          <Typography
            variant="subtitle2"
            sx={{
              mb: 0,
            }}>
            {t('inputs')}
          </Typography>

          {noInputs && (
            <AddInputButton
              assistant={value}
              ButtonProps={{
                startIcon: undefined,
                children: <Icon icon={PlusIcon} />,
                sx: { minWidth: 24, minHeight: 24 },
              }}
            />
          )}
        </Box>
      </Stack>
      {noInputs ? (
        <Stack
          sx={{
            alignItems: 'center',
          }}>
          <Typography
            sx={{
              color: 'text.disabled',
            }}>
            {t('noInputsTip')}
          </Typography>
        </Stack>
      ) : (
        <InputTable
          assistant={value}
          readOnly={readOnly}
          projectId={projectId}
          gitRef={gitRef}
          compareValue={compareValue}
          isRemoteCompare={isRemoteCompare}
          openApis={openApis}
        />
      )}
    </Box>
  );
}
