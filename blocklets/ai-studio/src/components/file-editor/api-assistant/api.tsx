import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ApiAssistantYjs, nextAssistantId } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { sortBy } from 'lodash';
import { useAssistantCompare } from 'src/pages/project/state';

import Add from '../../../pages/project/icons/add';
import Trash from '../../../pages/project/icons/trash';
import PromptEditorField from '../prompt-editor-field';

export default function ApiAssistantEditorAPI({
  value,
  disabled,
  compareValue,
  isRemoteCompare,
}: {
  value: ApiAssistantYjs;
  disabled?: boolean;
  compareValue?: ApiAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly: disabled, isRemoteCompare });

  return (
    <Box
      sx={{
        border: 2,
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
        overflow: 'hidden',
      }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />

        <Typography variant="subtitle1">{t('api')}</Typography>
      </Stack>

      <Stack bgcolor="background.paper" borderRadius={2} pt={1}>
        <Table size="small" sx={{ td: { border: 'none' } }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" width="200">
                {t('parameter')}
              </TableCell>
              <TableCell align="center">{t('value')}</TableCell>
              <TableCell align="center" width="100">
                {t('actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {value.requestParameters &&
              sortBy(Object.values(value.requestParameters), (i) => i.index).map(({ data: parameter }) => {
                return (
                  <TableRow
                    key={parameter.id}
                    sx={{ backgroundColor: getDiffBackground('requestParameters', parameter.id) }}>
                    <TableCell>
                      <TextField
                        hiddenLabel
                        fullWidth
                        value={parameter.key || ''}
                        InputProps={{ readOnly: disabled }}
                        onChange={(e) => (parameter.key = e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <PromptEditorField
                        sx={{ '.ContentEditable__root': { fontSize: '12px' } }}
                        readOnly={disabled}
                        assistant={value}
                        value={parameter.value}
                        onChange={(value) => (parameter.value = value)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        disabled={disabled}
                        sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                        onClick={() => {
                          const doc = (getYjsValue(value) as Map<any>).doc!;
                          doc.transact(() => {
                            if (!value.requestParameters) return;
                            delete value.requestParameters[parameter.id];
                            Object.values(value.requestParameters).forEach((i, index) => (i.index = index));
                          });
                        }}>
                        <Trash />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <Box>
          {!disabled && (
            <Button
              sx={{ px: 2 }}
              startIcon={<Add />}
              onClick={() => {
                const doc = (getYjsValue(value) as Map<any>).doc!;
                doc.transact(() => {
                  const id = nextAssistantId();

                  value.requestParameters ??= {};
                  value.requestParameters[id] = {
                    index: Math.max(-1, ...Object.values(value.requestParameters).map((i) => i.index)) + 1,
                    data: { id },
                  };
                });
              }}>
              {t('addObject', { object: t('parameter') })}
            </Button>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
