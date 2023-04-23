import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Conversation, ConversationRef, MessageItem, useConversation } from '@blocklet/ai-kit';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { Download, DragIndicator, HighlightOff, Save, Start } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Tooltip } from '@mui/material';
import equal from 'fast-deep-equal';
import saveAs from 'file-saver';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import { pick } from 'lodash';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useBeforeUnload, useSearchParams } from 'react-router-dom';
import { stringify } from 'yaml';

import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView, { TemplateForm } from '../../components/template-form';
import TemplateList, { TemplatesProvider, useTemplates } from '../../components/template-list';
import { ImageGenerationSize, imageGenerations, textCompletions } from '../../libs/ai';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';

export default function TemplatePage() {
  return (
    <TemplatesProvider>
      <TemplateView />
    </TemplatesProvider>
  );
}

function TemplateView() {
  const { t } = useLocaleContext();
  const ref = useRef<ConversationRef>(null);
  const { dialog, showDialog } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  const { messages, add, cancel } = useConversation({
    scrollToBottom: (o) => ref.current?.scrollToBottom(o),
    textCompletions: (prompt, { meta }: { meta?: Template } = {}) => {
      return textCompletions({
        ...(typeof prompt === 'string' ? { prompt } : { messages: prompt }),
        model: meta?.model,
        temperature: meta?.temperature,
        stream: true,
      });
    },
    imageGenerations: (prompt) =>
      imageGenerations({ ...prompt, size: prompt.size as ImageGenerationSize, response_format: 'b64_json' }).then(
        (res) => res.data.map((i) => ({ url: `data:image/png;base64,${i.b64_json}` }))
      ),
  });

  const { templates, loading, submiting, create, update, remove } = useTemplates();
  const [current, setCurrentTemplate] = useState<Template>();
  const [form, setForm] = useState<Template>();

  useEffect(() => {
    setForm(current);
  }, [current]);

  const setFormValue = useCallback(
    (update: Template | ((value: WritableDraft<Template>) => void)) => {
      setForm((form) =>
        typeof update === 'function'
          ? produce(form, (draft) => {
              update(draft!);
            })
          : update
      );
    },
    [setForm]
  );

  const formChanged = useMemo(() => !equal(form, current), [form]);

  const setCurrent = useCallback(
    (template: Template) => {
      if (formChanged) {
        showDialog({
          maxWidth: 'xs',
          fullWidth: true,
          title: t('alert.discardChanges'),
          okText: t('alert.discard'),
          okColor: 'error',
          cancelText: t('alert.cancel'),
          middleText: t('form.save'),
          middleColor: 'primary',
          onOk: () => {
            setCurrentTemplate(template);
          },
          onMiddleClick: async () => {
            await saveRef.current();
            setCurrentTemplate(template);
          },
        });
      } else {
        setCurrentTemplate(template);
      }
    },
    [formChanged]
  );

  useBeforeUnload(
    useCallback(
      (e) => {
        if (formChanged) {
          e.returnValue = t('alert.discardChanges');
        }
      },
      [formChanged]
    )
  );

  const to = useCallback(
    (templateId?: string, replace?: boolean) =>
      setSearchParams(
        (params) => {
          if (templateId) {
            params.set('templateId', templateId);
          } else {
            params.delete('templateId');
          }
          return params;
        },
        { replace }
      ),
    []
  );

  const templateId = searchParams.get('templateId');

  // Set current template after templates loaded
  useEffect(() => {
    if (!templateId) {
      const template = templates[0];
      if (template) to(template._id, true);
      return;
    }
    if (templates.length && !templates.some((i) => i._id === templateId)) {
      const template = templates[0];
      if (template) to(template._id, true);
      else to(undefined, true);
      return;
    }
    if (current?._id !== templateId) {
      const tpl = templates.find((i) => i._id === templateId);
      if (tpl) setCurrent(tpl);
    }
  }, [templates, templateId]);

  const onExecute = async (template: TemplateForm) => {
    const { parameters } = template;
    const question = parameters?.question?.value;

    let next: Template | TemplateForm | undefined = template;

    while (next) {
      const template = next;
      next = undefined;

      if (template.type === 'branch') {
        const branches = template.branch?.branches.filter((i) => i.template?.name);
        if (!branches || !question) {
          return;
        }
        const { text } = await add(
          [
            ...(template.prompts
              ?.filter((i): i is Required<typeof i> => !!i.content && !!i.role)
              .map((i) => pick(i, 'content', 'role')) ?? []),
            {
              role: 'system',
              content: `\
你是一个分支选择器，你需要根据用户输入的问题选择最合适的一个分支。可用的分支如下：

${branches.map((i) => `Branch_${i.template!.id}: ${i.description || ''}`).join('\n')}

Use the following format:

Question: the input question you must think about
Thought: you should always consider which branch is more suitable
Branch: the branch to take, should be one of [${branches.map((i) => `Branch_${i.template!.id}`).join('\n')}]

Begin!"

Question: ${question}\
`,
            },
          ],
          template
        );

        const branchId = text && /Branch_(\w+)/s.exec(text)?.[1]?.trim();
        if (branchId && template.branch?.branches.some((i) => i.template?.id === branchId)) {
          next = templates.find((i) => i._id === branchId);
        }
      } else {
        const prompts = template.prompts
          ?.filter((i): i is Required<typeof i> => !!i.content && !!i.role)
          .map((i) => {
            let { content } = i;
            for (const [param, value] of Object.entries(parameters ?? {})) {
              content = content.replace(new RegExp(`{{\\s*(${param})\\s*}}`, 'g'), parameterToStringValue(value));
            }
            return { content, role: i.role };
          });
        if (prompts) {
          add(prompts, template);
        }
      }
    }
  };

  const customActions = useCallback(
    (msg: MessageItem): [ReactNode[], ReactNode[]] => {
      return [
        [],
        [
          msg.meta?._id && (
            <Tooltip key="template" title="Use current template" placement="top">
              <Button
                size="small"
                onClick={() => {
                  const tpl = templates.find((i) => i._id === msg.meta?._id);
                  if (tpl && tpl._id !== current?._id) {
                    to(tpl._id);
                  }
                }}>
                <Start fontSize="small" />
              </Button>
            </Tooltip>
          ),
          msg.loading && (
            <Tooltip key="stop" title="Stop" placement="top">
              <Button size="small" onClick={() => cancel(msg)}>
                <HighlightOff fontSize="small" />
              </Button>
            </Tooltip>
          ),
        ],
      ];
    },
    [cancel]
  );

  const save = useCallback(async () => {
    try {
      if (form?._id) {
        const template = await update(form._id, form);
        setCurrentTemplate(template);
        setForm(template);
        Toast.success(t('alert.saved'));
      }
    } catch (error) {
      Toast.error(getErrorMessage(error));
      throw error;
    }
  }, [form, t, update]);

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveRef.current();
        }
      }
    };

    window.addEventListener('keydown', onKeydown);

    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const headerAddons = ([...exists]: ReactNode[]) => {
    exists.unshift(
      <LoadingButton
        disabled={!formChanged}
        loading={submiting}
        loadingPosition="start"
        startIcon={<Save />}
        onClick={save}>
        {t('form.save')}
      </LoadingButton>
    );

    if (form) {
      exists.unshift(
        <Button
          startIcon={<Download />}
          onClick={() => {
            const text = stringify(form);
            saveAs(new Blob([text]), `${form.name || form._id}.yml`);
          }}>
          {t('alert.export')}
        </Button>
      );
    }
    return exists;
  };

  return (
    <Root footerProps={{ className: 'dashboard-footer' }} headerAddons={headerAddons}>
      <Box
        component={PanelGroup}
        autoSaveId="ai-studio-template-layouts"
        direction="horizontal"
        sx={{ height: '100%' }}>
        <Box component={Panel} defaultSize={10} minSize={10}>
          <TemplateList
            sx={{ height: '100%', overflow: 'auto' }}
            className="list"
            templates={templates}
            loading={loading}
            current={current}
            onCreate={async (input) => setCurrent(await create({ name: '', ...input }))}
            onDelete={(template) =>
              showDialog({
                maxWidth: 'xs',
                fullWidth: true,
                title: t('alert.deleteTemplate'),
                okText: t('alert.delete'),
                okColor: 'error',
                cancelText: t('alert.cancel'),
                onOk: async () => {
                  try {
                    await remove(template._id);
                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  }
                },
              })
            }
            onClick={(template) => to(template._id)}
          />
        </Box>
        <ResizeHandle />
        <Box component={Panel} minSize={30}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {form && (
              <TemplateFormView
                value={form}
                onChange={setFormValue}
                onExecute={onExecute}
                onTemplateClick={({ id }) => {
                  const template = templates.find((i) => i._id === id);
                  if (template) to(template._id);
                }}
              />
            )}
          </Box>
        </Box>
        <ResizeHandle />
        <Box component={Panel} defaultSize={45} minSize={20}>
          <Conversation
            ref={ref}
            messages={messages}
            sx={{ height: '100%', overflow: 'auto' }}
            onSubmit={(prompt) => add(prompt)}
            customActions={customActions}
          />
        </Box>
      </Box>

      {dialog}
    </Root>
  );
}

const Root = styled(Dashboard)`
  > .dashboard-body > .dashboard-main {
    > .dashboard-content {
      overflow: hidden;
      padding: 0;
    }

    > .dashboard-footer {
      margin-top: 0;
      padding: 0;
    }
  }
`;

function ResizeHandle() {
  return (
    <Box
      component={PanelResizeHandle}
      sx={{
        width: 10,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.200',
        opacity: 0.6,
        ':hover': {
          opacity: 1,
        },
      }}>
      <DragIndicator sx={{ fontSize: 14 }} />
    </Box>
  );
}
