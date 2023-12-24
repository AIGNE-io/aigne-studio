import IndicatorTextField from '@app/components/awareness/indicator-text-field';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ApiAssistantYjs, nextAssistantId } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, alpha } from '@mui/material';
import { sortBy } from 'lodash';

import { useReadOnly } from '../../../contexts/session';
import Add from '../../../pages/project/icons/add';
import Trash from '../../../pages/project/icons/trash';
import BasicInfoForm from '../basic-info-form';
import OutputSettings from '../output-settings';
import ParametersTable from '../parameters-table';
import PrepareExecuteList from '../prepare-execute-list';
import PromptEditorField from '../prompt-editor-field';
import ApiAssistantSetting from './setting';

// TODO 放到theme中
const bgcolor = 'rgba(249, 250, 251, 1)';

export default function ApiAssistantEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: ApiAssistantYjs;
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
        <ParametersTable projectId={projectId} gitRef={gitRef} readOnly={disabled} value={value} />
      </Box>

      <Stack sx={{ bgcolor, p: 1, px: 2, borderRadius: 1, gap: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="subtitle1">{t('prepareExecutes')}</Typography>

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
              {t('haveNotAddedTip', { object: t('executeBlock') })}
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
                        <IndicatorTextField
                          projectId={projectId}
                          gitRef={gitRef}
                          path={[value.id, 'requestParameters', parameter.id ?? '', 'key']}
                          TextFiledProps={{
                            hiddenLabel: true,
                            fullWidth: true,
                            value: parameter.key || '',
                            onChange: (e) => (parameter.key = e.target.value),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <PromptEditorField
                          projectId={projectId}
                          gitRef={gitRef}
                          path={[value.id, 'requestParameters', parameter.id ?? '', 'value']}
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
          </Box>
        </Stack>
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <ApiAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <OutputSettings projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}
