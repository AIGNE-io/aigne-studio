import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Add, Delete, DragIndicatorRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  Input,
  MenuItem,
  Select,
  SelectProps,
  Stack,
  inputClasses,
  outlinedInputClasses,
  selectClasses,
} from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Role } from '../../../api/src/store/templates';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';

export default function Prompts({
  projectId,
  gitRef,
  value: form,
}: {
  projectId: string;
  gitRef: string;
  value: Pick<TemplateYjs, 'id' | 'prompts'>;
}) {
  const { t } = useLocaleContext();

  return (
    <Box>
      {form.prompts && (
        <Box sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, borderRadius: 2 }}>
          <DragSortListYjs
            list={form.prompts}
            renderItem={(prompt, index, params) => (
              <Box
                ref={params.drop}
                sx={{
                  bgcolor: params.isDragging ? 'grey.100' : undefined,
                  '&:not(:last-of-type)': {
                    borderBottom: (theme) => `1px solid ${theme.palette.grey[200]}`,
                  },
                }}>
                <Stack direction="row" sx={{ position: 'relative' }}>
                  <Stack sx={{ position: 'absolute', zIndex: 1, top: 4, left: 4 }}>
                    <RoleSelector
                      value={prompt.role ?? 'system'}
                      onChange={(e) => (prompt.role = e.target.value as any)}
                    />
                  </Stack>

                  <WithAwareness projectId={projectId} gitRef={gitRef} path={[form.id, 'prompts', index]}>
                    <Input
                      ref={params.preview}
                      disableUnderline
                      fullWidth
                      multiline
                      minRows={2}
                      value={prompt.content ?? ''}
                      onChange={(e) => (prompt.content = e.target.value)}
                      sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        [`.${inputClasses.input}`]: { px: 1, textIndent: indentWidth(prompt.role) },
                      }}
                    />
                  </WithAwareness>

                  <Stack sx={{ p: 0.5 }}>
                    <Button
                      sx={{ minWidth: 0, p: 0.2 }}
                      onClick={() => {
                        const doc = (getYjsValue(form.prompts) as Map<any>).doc!;
                        doc.transact(() => {
                          if (form.prompts) {
                            delete form.prompts[prompt.id];
                            sortBy(Object.values(form.prompts), (i) => i.index).forEach(
                              (i, index) => (i.index = index)
                            );
                          }
                        });
                      }}>
                      <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                    </Button>

                    <Button ref={params.drag} sx={{ minWidth: 0, p: 0.2 }}>
                      <DragIndicatorRounded sx={{ fontSize: 16, color: 'grey.500' }} />
                    </Button>
                  </Stack>

                  <AwarenessIndicator
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[form.id, 'prompts', index]}
                    sx={{ position: 'absolute', left: '100%', top: 0 }}
                  />
                </Stack>
              </Box>
            )}
          />
        </Box>
      )}

      <Button
        sx={{ mt: 1 }}
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid();
          const doc = (getYjsValue(form) as Map<any>).doc!;
          doc.transact(() => {
            form.prompts ??= {};
            form.prompts[id] = {
              index: Object.keys(form.prompts).length,
              data: { id, content: '', role: 'user' },
            };
          });
        }}>
        {t('form.add')} {t('form.prompt')}
      </Button>
    </Box>
  );
}

function RoleSelector({ ...props }: SelectProps<Role>) {
  return (
    <Select
      {...props}
      sx={{
        [`.${selectClasses.select}`]: {
          fontSize: 12,
          py: 0,
          px: 1,
          pr: '18px !important',
          bgcolor: 'grey.100',
        },
        [`.${selectClasses.icon}`]: {
          fontSize: 16,
          right: 2,
        },
        [`.${outlinedInputClasses.notchedOutline}`]: {
          border: 'none',
        },
        ...props.sx,
      }}
      variant="outlined"
      size="small">
      <MenuItem value="system">System</MenuItem>
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="assistant">Assistant</MenuItem>
    </Select>
  );
}

const indentWidth = (role?: Role) => {
  const map = {
    system: '72px',
    user: '56px',
    assistant: '81px',
  };
  return map[role!] || map.user;
};
