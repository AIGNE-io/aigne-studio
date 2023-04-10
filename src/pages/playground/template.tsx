import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Conversation, ConversationRef, MessageItem, useConversation } from '@blocklet/ai-kit';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { Download, HighlightOff, Save, Start } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Divider, Tooltip } from '@mui/material';
import equal from 'fast-deep-equal';
import saveAs from 'file-saver';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useSearchParams } from 'react-router-dom';
import { stringify } from 'yaml';

import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView, { TemplateForm } from '../../components/template-form';
import TemplateList, { useTemplates } from '../../components/template-list';
import { ImageGenerationSize, imageGenerations, textCompletions } from '../../libs/ai';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';

export default function TemplateView() {
  const { t } = useLocaleContext();
  const ref = useRef<ConversationRef>(null);
  const { dialog, showDialog } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  const { messages, add, cancel } = useConversation({
    scrollToBottom: (o) => ref.current?.scrollToBottom(o),
    textCompletions: (prompt) => {
      return textCompletions({
        prompt,
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

  // Set current template after templates loaded
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (!current) {
      const current = templates.find((i) => i._id === templateId);
      if (current) {
        setCurrent(current);
      }
    }
  }, [templates]);

  useEffect(() => {
    if (current) {
      setSearchParams((params) => {
        params.set('templateId', current._id);
        return params;
      });
    }

    setForm(current);
  }, [current?._id]);

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
          `\
你是一个分支选择器，你需要根据用户输入的问题选择最合适的一个分支。可用的分支如下：

${branches.map((i) => `Branch_${i.template!.id}: ${i.description || ''}`).join('\n')}

Use the following format:

Question: the input question you must think about
Thought: you should always consider which branch is more suitable
Branch: the branch to take, should be one of [${branches.map((i) => `Branch_${i.template!.id}`).join('\n')}]

Begin!"

Question: ${question}\
`,
          template
        );

        const branchId = text && /Branch_(\w+)/s.exec(text)?.[1]?.trim();
        if (branchId && template.branch?.branches.some((i) => i.template?.id === branchId)) {
          next = templates.find((i) => i._id === branchId);
        }
      } else {
        let prompt = template.template;
        if (prompt) {
          for (const [param, value] of Object.entries(parameters ?? {})) {
            prompt = prompt.replace(new RegExp(`{{\\s*(${param})\\s*}}`, 'g'), parameterToStringValue(value));
          }

          add(prompt, template);
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
                    setCurrent(tpl);
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
      <TemplateList
        sx={{ width: 200, overflow: 'auto' }}
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
            cancelText: t('alert.cancel'),
            onOk: async () => {
              try {
                await remove(template._id);
                Toast.success(t('alert.deleted'));
                setCurrentTemplate(templates[0]);
                setForm(templates[0]);
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            },
          })
        }
        onClick={setCurrent}
      />

      <Divider orientation="vertical" />

      <Conversation
        className="conversation"
        ref={ref}
        sx={{ flex: 1 }}
        messages={messages}
        onSubmit={(prompt) => add(prompt)}
        customActions={customActions}
      />

      <Divider orientation="vertical" />

      <Box className="form" flex={1} p={2} overflow="auto">
        {form && (
          <TemplateFormView
            value={form}
            onChange={setFormValue}
            onExecute={onExecute}
            onTemplateClick={({ id }) => {
              const template = templates.find((i) => i._id === id);
              if (template) setCurrent(template);
            }}
          />
        )}
      </Box>

      {dialog}
    </Root>
  );
}

const Root = styled(Dashboard)`
  > .dashboard-body > .dashboard-main {
    > .dashboard-content {
      display: flex;
      padding-left: 0;
      padding-right: 0;
      overflow: hidden;

      @media (max-width: 900px) {
        flex-direction: column;
        overflow: auto;

        > .list {
          width: 100%;
          overflow: visible;
          flex: unset;
        }

        > .conversation {
          overflow: unset;
        }

        > .MuiDivider-root {
          height: 1px;
          width: 100%;
          margin: 32px 0;
          border-bottom: 1px solid #eee;
        }

        > .form {
          flex: unset;
          overflow: unset;
        }
      }
    }

    > .dashboard-footer {
      margin-top: 0;
      padding: 0;
    }
  }
`;
