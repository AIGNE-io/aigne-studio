import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Delete } from '@mui/icons-material';
import { Box, Button, MenuItem, Select, SelectProps, TextField } from '@mui/material';
import { nanoid } from 'nanoid';

import { Role, Template } from '../../../api/src/store/templates';
import ReorderableList from '../reorderable-list';
import TokenCounter from './token-counter';

export default function Prompts({ value: form }: { value: Pick<Template, 'prompts'> }) {
  const { t } = useLocaleContext();

  return (
    <>
      {form.prompts && (
        <Box sx={{ py: 1 }}>
          <ReorderableList
            list={form.prompts}
            itemKey="id"
            onChange={(prompts) => (form.prompts = prompts)}
            renderItem={(prompt, index) => (
              <>
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
                        form.prompts![index]!.role = e.target.value as any;
                      }}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    label={`${t('form.prompt')} ${index + 1}`}
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={10}
                    value={prompt.content ?? ''}
                    onChange={(e) => {
                      form.prompts![index]!.content = e.target.value;
                    }}
                    helperText={<TokenCounter value={prompt.content ?? ''} />}
                    FormHelperTextProps={{ sx: { textAlign: 'right', mt: 0 } }}
                  />
                </Box>

                <Box sx={{ ml: 0.5 }}>
                  <Button
                    sx={{ minWidth: 0, p: 0.2 }}
                    onClick={() => {
                      form.prompts?.splice(index, 1);
                    }}>
                    <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                  </Button>
                </Box>
              </>
            )}
          />
        </Box>
      )}

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() => {
          form.prompts ??= [];
          form.prompts.push({ id: nanoid(), content: '', role: 'system' });
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
