import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Add, Delete } from '@mui/icons-material';
import { Box, Button, MenuItem, Select, SelectProps, TextField } from '@mui/material';
import { nanoid } from 'nanoid';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Role } from '../../../api/src/store/templates';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import { ReorderableListYjs } from '../reorderable-list';
import TokenCounter from './token-counter';

export default function Prompts({ value: form }: { value: Pick<TemplateYjs, 'id' | 'prompts'> }) {
  const { t } = useLocaleContext();

  return (
    <>
      {form.prompts && (
        <Box sx={{ py: 1 }}>
          <ReorderableListYjs
            list={form.prompts}
            renderItem={(prompt, index) => (
              <Box sx={{ position: 'relative', display: 'flex', flex: 1 }}>
                <Box sx={{ flex: 1, mt: 1, position: 'relative' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      zIndex: 1,
                      right: 12,
                      transform: 'translateY(-50%)',
                      bgcolor: 'background.paper',
                    }}>
                    <RoleSelector
                      sx={{
                        '.MuiSelect-select': {
                          fontSize: 12,
                          height: 18,
                          lineHeight: '18px',
                          pl: 1,
                          pr: '16px !important',
                          py: 0,
                          ':focus': { bgcolor: 'transparent' },
                        },
                        svg: {
                          fontSize: 18,
                        },
                      }}
                      variant="standard"
                      disableUnderline
                      size="small"
                      value={prompt.role ?? 'system'}
                      onChange={(e) => {
                        prompt.role = e.target.value as any;
                      }}
                    />
                  </Box>

                  <WithAwareness path={[form.id, 'prompts', index]}>
                    <TextField
                      fullWidth
                      label={`${t('form.prompt')} ${index + 1}`}
                      size="small"
                      multiline
                      minRows={2}
                      maxRows={10}
                      value={prompt.content ?? ''}
                      onChange={(e) => {
                        prompt.content = e.target.value;
                      }}
                      helperText={<TokenCounter value={prompt.content ?? ''} />}
                      FormHelperTextProps={{ sx: { textAlign: 'right', mt: 0 } }}
                    />
                  </WithAwareness>
                </Box>

                <Box sx={{ ml: 0.5 }}>
                  <Button
                    sx={{ minWidth: 0, p: 0.2 }}
                    onClick={() => {
                      delete form.prompts?.[prompt.id];
                    }}>
                    <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                  </Button>

                  <AwarenessIndicator path={[form.id, 'prompts', index]} />
                </Box>
              </Box>
            )}
          />
        </Box>
      )}

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid();
          (getYjsValue(form) as Map<any>).doc!.transact(() => {
            form.prompts ??= {};
            form.prompts[id] = { index: Object.keys(form.prompts).length, data: { id, content: '', role: 'system' } };
          });
        }}>
        {t('form.add')} {t('form.prompt')}
      </Button>
    </>
  );
}

function RoleSelector({ ...props }: SelectProps<Role>) {
  return (
    <Select {...props}>
      <MenuItem value="system">System</MenuItem>
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="assistant">Assistant</MenuItem>
    </Select>
  );
}
