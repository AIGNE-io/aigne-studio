import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Construction, Delete, DragIndicator } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { nanoid } from 'nanoid';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';

import { useTemplates } from '../template-list';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function Branches({
  value,
  onChange,
  onTemplateClick,
}: {
  value: Pick<TemplateForm, 'branch' | 'parameters'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { t } = useLocaleContext();
  const { templates, create } = useTemplates();

  const isTemplateEmpty = ({ id }: { id: string }) => {
    const t = templates.find((i) => i._id === id);
    if (t?.type === 'branch') return !t.branch?.branches.length;
    // TODO: validate template correctly
    return !t?.prompts?.length;
  };

  return (
    <>
      <DragDropContext
        onDragEnd={({ source, destination }) => {
          if (destination) {
            onChange((v) => {
              v.branch!.branches.splice(destination.index, 0, ...v.branch!.branches.splice(source.index, 1));
            });
          }
        }}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <Box ref={provided.innerRef} {...provided.droppableProps}>
              {value.branch?.branches.map((branch, index) => (
                <Draggable key={branch.id} draggableId={branch.id} index={index}>
                  {(provided) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{ display: 'flex', alignItems: 'flex-start', py: 1, bgcolor: 'background.paper' }}>
                      <Box>
                        <Box sx={{ mt: 0.5, mr: 0.5 }} {...provided.dragHandleProps}>
                          <DragIndicator sx={{ fontSize: 18, color: 'grey.700' }} />
                        </Box>
                      </Box>

                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <TemplateAutocomplete
                          autoSelect
                          freeSolo
                          fullWidth
                          size="small"
                          value={branch.template ?? null}
                          onChange={(_, value) =>
                            onChange(
                              (v) =>
                                (v.branch!.branches[index]!.template =
                                  (typeof value === 'string' ? { id: '', name: value } : value) ?? undefined)
                            )
                          }
                          renderInput={(params) => <TextField {...params} label={t('form.name')} />}
                          options={templates}
                          createTemplate={create}
                        />

                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          maxRows={5}
                          label={t('form.description')}
                          value={branch.description}
                          onChange={(e) => onChange((v) => (v.branch!.branches[index]!.description = e.target.value))}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                        {onTemplateClick && branch.template && (
                          <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => onTemplateClick(branch.template!)}>
                            <Construction
                              sx={{
                                fontSize: 16,
                                color: isTemplateEmpty(branch.template) ? 'warning.main' : 'grey.500',
                              }}
                            />
                          </Button>
                        )}

                        <Button
                          sx={{ minWidth: 0, p: 0.2 }}
                          onClick={() => onChange((v) => v.branch!.branches.splice(index, 1))}>
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
        onClick={() => {
          const id = nanoid();
          onChange((v) => {
            v.branch?.branches.push({ id, description: '' });
          });
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.add')} {t('form.branch')}
      </Button>
    </>
  );
}
