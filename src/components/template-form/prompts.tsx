import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Delete, DragIndicator } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Input,
  MenuItem,
  Select,
  SelectProps,
  Stack,
  inputClasses,
} from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { nanoid } from 'nanoid';

import { Role, Template } from '../../../api/src/store/templates';
import ReorderList from '../reorder-list';

export default function Prompts({
  value,
  onChange,
}: {
  value: Pick<Template, 'prompts'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <>
      {value.prompts && (
        <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, overflow: 'hidden' }}>
          <ReorderList
            customDragControl
            list={value.prompts}
            itemKey="id"
            onChange={(prompts) => onChange((v) => (v.prompts = prompts))}
            renderItem={(prompt, index, ctrl) => (
              <Box sx={{ flex: 1, position: 'relative' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 20,
                    lineHeight: '20px',
                    position: 'absolute',
                    zIndex: 1,
                    left: 4,
                    top: 4,
                    bgcolor: 'grey.300',
                    borderRadius: 1,
                  }}>
                  <RoleSelector
                    sx={{
                      '.MuiSelect-select': {
                        fontSize: 14,
                        height: 20,
                        lineHeight: '20px',
                        pl: 1,
                        pr: '16px !important',
                        py: 0,
                        ':focus': { bgcolor: 'transparent' },
                      },
                      svg: {
                        fontSize: 20,
                      },
                    }}
                    variant="standard"
                    disableUnderline
                    size="small"
                    value={prompt.role ?? 'system'}
                    onChange={(e) =>
                      onChange((v) => {
                        v.prompts![index]!.role = e.target.value as any;
                      })
                    }
                  />
                </Box>

                <Input
                  disableUnderline
                  fullWidth
                  multiline
                  minRows={2}
                  value={prompt.content ?? ''}
                  sx={{
                    lineHeight: '24px',
                    p: 2,
                    pr: '38px',
                    pt: 3,
                    [`&.${inputClasses.focused}`]: { bgcolor: 'grey.200' },
                  }}
                  onChange={(e) =>
                    onChange((v) => {
                      v.prompts![index]!.content = e.target.value;
                    })
                  }
                />

                {index !== value.prompts!.length - 1 && <Divider />}

                <Stack sx={{ position: 'absolute', right: 0, top: 0, zIndex: 1000 }}>
                  <IconButton
                    size="small"
                    disableRipple
                    sx={{ cursor: 'grab', userSelect: 'none', color: 'grey.500' }}
                    onPointerDown={(e) => ctrl.start(e)}>
                    <DragIndicator fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    disableRipple
                    sx={{ color: 'grey.500' }}
                    onClick={() => onChange((v) => v.prompts?.splice(index, 1))}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            )}
          />
        </Box>
      )}

      <Button
        sx={{ mt: 2 }}
        variant="contained"
        size="small"
        startIcon={<Add />}
        onClick={() =>
          onChange((v) => {
            v.prompts ??= [];
            v.prompts.push({ id: nanoid(), content: '', role: 'system' });
          })
        }>
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
