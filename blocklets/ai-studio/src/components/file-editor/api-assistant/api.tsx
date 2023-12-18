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
} from '@mui/material';
import { sortBy } from 'lodash';

import Add from '../../../pages/project/icons/add';
import Trash from '../../../pages/project/icons/trash';
import PromptEditorField from '../prompt-editor-field';

export default function ApiAssistantEditorAPI({ value, disabled }: { value: ApiAssistantYjs; disabled?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />

        <Typography variant="subtitle1">{t('api')}</Typography>
      </Stack>

      <Stack bgcolor="background.paper" borderRadius={2} pt={1}>
        <Table
          size="small"
          sx={{
            td: {
              border: 'none',
            },
          }}>
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
                  <TableRow key={parameter.id}>
                    <TableCell>
                      <TextField
                        hiddenLabel
                        fullWidth
                        value={parameter.key || ''}
                        onChange={(e) => (parameter.key = e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <PromptEditorField
                        readOnly={disabled}
                        assistant={value}
                        value={parameter.value}
                        onChange={(value) => (parameter.value = value)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
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
    </>
  );
}
