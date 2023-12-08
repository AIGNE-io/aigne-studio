import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import Add from 'src/pages/project/icons/add';
import { nextTemplateId } from 'src/pages/project/yjs-state';

import { FunctionFileYjs } from '../../../../api/src/store/projects';
import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import OutputSettings from '../output-settings';
import ParametersTable from '../parameters-table';
import PrepareExecuteList from '../prepare-execute-list';
import FunctionCodeEditor from './function-code-editor';
import FunctionAssistantSetting from './setting';

// TODO 放到theme中
const bgcolor = 'rgba(249, 250, 251, 1)';

export default function FunctionFileEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: FunctionFileYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack gap={2} pb={10}>
      <Box sx={{ bgcolor, p: 1, borderRadius: 1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ bgcolor, py: 1, px: 2, borderRadius: 1 }}>
        <ParametersTable readOnly={disabled} value={value} />
      </Box>

      <Stack sx={{ bgcolor, p: 1, px: 2, borderRadius: 1, gap: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle1">{t('prepareExecutes')}</Typography>

          <Button
            sx={{ minWidth: 32, minHeight: 32, p: 0 }}
            onClick={() => {
              const doc = (getYjsValue(value) as Map<any>).doc!;
              doc.transact(() => {
                const id = nextTemplateId();
                value.prepareExecutes ??= {};
                value.prepareExecutes[id] = {
                  index: Math.max(-1, ...Object.values(value.prepareExecutes).map((i) => i.index)) + 1,
                  data: { id },
                };
              });
            }}>
            <Add />
          </Button>
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
      </Stack>

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

        <FunctionCodeEditor value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <FunctionAssistantSetting />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <OutputSettings value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}
