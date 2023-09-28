import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import PromptEditor from '@blocklet/prompt-editor';
import { Add, Delete } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { nanoid } from 'nanoid';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import { ReorderableListYjs } from '../reorderable-list';

// import TokenCounter from './token-counter';

export default function Prompts({ value: form }: { value: Pick<TemplateYjs, 'id' | 'prompts'> }) {
  const { t } = useLocaleContext();

  return (
    <>
      {form.prompts && (
        <Box sx={{ py: 1 }}>
          <ReorderableListYjs
            list={form.prompts}
            renderItem={(prompt, index) => {
              let content: string = '';

              return (
                <Box sx={{ position: 'relative', display: 'flex', flex: 1 }}>
                  <Box sx={{ flex: 1, mt: 1, position: 'relative' }}>
                    <WithAwareness path={[form.id, 'prompts', index]}>
                      <PromptEditor
                        placeholder={`${t('form.prompt')} ${index + 1}`}
                        value={prompt.contentLexicalJson}
                        onChange={async (state) => {
                          const json = state.toJSON();

                          if (json.root) {
                            const paragraph = json.root.children[0] as unknown as {
                              type: string;
                              text: string;
                              children: any;
                            };

                            if (paragraph && paragraph?.type === 'paragraph' && paragraph?.children?.length) {
                              paragraph.children.forEach((x: any) => {
                                if (x.type === 'role') {
                                  prompt.role = x.text;
                                } else if (x.type !== 'comment') {
                                  if (x.type === 'linebreak') {
                                    content += '\n';
                                  } else {
                                    content += x.text || '';
                                  }
                                }
                              });
                            }
                          }

                          prompt.content = content.replace(/\n+/g, '\n');
                          prompt.contentLexicalJson = JSON.stringify(state);
                        }}
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
              );
            }}
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

// function RoleSelector({ ...props }: SelectProps<Role>) {
//   return (
//     <Select {...props}>
//       <MenuItem value="system">System</MenuItem>
//       <MenuItem value="user">User</MenuItem>
//       <MenuItem value="assistant">Assistant</MenuItem>
//     </Select>
//   );
// }
