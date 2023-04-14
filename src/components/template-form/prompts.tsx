import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Delete, DragIndicator } from '@mui/icons-material';
import { Box, Button, MenuItem, Select, SelectProps, TextField } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { nanoid } from 'nanoid';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { Role, Template } from '../../../api/src/store/templates';
import TokenCounter from './token-counter';

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
      <DragDropContext
        onDragEnd={({ source, destination }) => {
          if (destination) {
            onChange((v) => {
              v.prompts!.splice(destination.index, 0, ...v.prompts!.splice(source.index, 1));
            });
          }
        }}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <Box {...provided.droppableProps} ref={provided.innerRef} sx={{ py: 1 }}>
              {value.prompts?.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        bgcolor: 'background.paper',
                        pt: 1.5,
                        overflow: 'hidden',
                        ...provided.draggableProps.style,
                      }}>
                      <Box sx={{ mr: 0.5, mt: 0.5 }} {...provided.dragHandleProps}>
                        <DragIndicator sx={{ fontSize: 18, color: 'grey.700' }} />
                      </Box>

                      <Box sx={{ flex: 1, position: 'relative' }}>
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
                            value={item.role ?? 'system'}
                            onChange={(e) => onChange((v) => (v.prompts![index]!.role = e.target.value as any))}
                          />
                        </Box>

                        <TextField
                          fullWidth
                          label={`${t('form.prompt')} ${index + 1}`}
                          size="small"
                          multiline
                          minRows={2}
                          maxRows={10}
                          value={item.content ?? ''}
                          onChange={(e) => onChange((v) => (v.prompts![index]!.content = e.target.value))}
                          helperText={<TokenCounter value={item.content ?? ''} />}
                          FormHelperTextProps={{ sx: { textAlign: 'right', mt: 0 } }}
                        />
                      </Box>

                      <Box sx={{ ml: 0.5 }}>
                        <Button
                          sx={{ minWidth: 0, p: 0.2 }}
                          onClick={() => onChange((v) => v.prompts!.splice(index, 1))}>
                          <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() =>
          onChange((v) => {
            v.prompts ??= [];
            v.prompts.push({ id: nanoid(), content: '', role: 'system' });
          })
        }>
        Add Prompt
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
