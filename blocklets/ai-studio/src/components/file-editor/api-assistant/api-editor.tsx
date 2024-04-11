import IndicatorTextField from '@app/components/awareness/indicator-text-field';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ApiAssistantYjs, nextAssistantId } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { sortBy } from 'lodash';
import { useAssistantCompare } from 'src/pages/project/state';

import Add from '../../../pages/project/icons/add';
import TipsAndUpdatesRounded from '../../../pages/project/icons/tips';
import Trash from '../../../pages/project/icons/trash';
import PromptEditorField from '../prompt-editor-field';

export default function ApiEditor({
  value,
  disabled,
  compareValue,
  isRemoteCompare,
  projectId,
  gitRef,
}: {
  value: ApiAssistantYjs;
  projectId: string;
  gitRef: string;
  disabled?: boolean;
  compareValue?: ApiAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly: disabled, isRemoteCompare });

  return (
    <Stack
      gap={1}
      sx={{
        borderRadius: 1,
        bgcolor: '#EFF6FF',
        px: 2,
        py: 1.5,
      }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <TipsAndUpdatesRounded sx={{ color: '#3B82F6', fontSize: 15 }} />
        <Typography variant="subtitle2" sx={{ m: 0 }}>
          {t('api')}
        </Typography>
      </Stack>

      <Box border="1px solid #3B82F6" borderRadius={1} bgcolor="background.paper" px={1.5} py={1}>
        <Stack gap={1}>
          <Table size="small" sx={{ td: { border: 'none' } }}>
            <TableHead>
              <TableRow>
                <TableCell width="200" sx={{ borderBottom: '1px solid #E5E7EB', pl: 0 }}>
                  {t('parameter')}
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #E5E7EB', pl: 0 }}>{t('value')}</TableCell>
                <TableCell width="100" sx={{ borderBottom: '1px solid, #E5E7EB', pl: 0 }}>
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
                      <TableCell sx={{ borderBottom: '1px solid #E5E7EB !important', pl: 0 }}>
                        <IndicatorTextField
                          projectId={projectId}
                          gitRef={gitRef}
                          path={[value.id, 'requestParameters', parameter.id, 'key']}
                          TextFiledProps={{
                            hiddenLabel: true,
                            value: parameter.key ?? '',
                            InputProps: {
                              readOnly: disabled,
                            },
                            onChange: (e) => (parameter.key = e.target.value),
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #E5E7EB !important', pl: 0 }}>
                        <PromptEditorField
                          sx={{ '.ContentEditable__root': { fontSize: '12px' } }}
                          readOnly={disabled}
                          assistant={value}
                          projectId={projectId}
                          gitRef={gitRef}
                          path={[value.id, 'requestParameters', parameter.id, 'value']}
                          value={parameter.value}
                          onChange={(value) => (parameter.value = value)}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #E5E7EB !important', pl: 0 }}>
                        <Button
                          disabled={disabled}
                          sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                          onClick={() => {
                            const doc = (getYjsValue(value) as Map<any>).doc!;
                            doc.transact(() => {
                              if (!value.requestParameters) return;
                              delete value.requestParameters[parameter.id];
                              sortBy(Object.values(value.requestParameters), 'index').forEach(
                                (i, index) => (i.index = index)
                              );
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
    </Stack>
  );
}
