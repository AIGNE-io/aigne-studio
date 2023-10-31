import { COMMENT_PREFIX } from '@blocklet/prompt-editor/utils';
import { call } from '@blocklet/sdk/lib/component';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { ImagesResponseDataInner } from 'openai';

import { AIKitEmbeddings } from '../core/embeddings/ai-kit';
import logger from '../libs/logger';
import { renderAsync } from '../libs/mustache-async';
import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import Log, { Status } from '../store/models/logs';
import Projects from '../store/models/projects';
import { Project, defaultBranch, getRepository } from '../store/projects';
import { Template, getTemplate } from '../store/templates';
import VectorStore from '../store/vector-store';
import { templateSchema } from './templates';

const router = Router();

router.get('/status', ensureComponentCallOrPromptsEditor(), async (_, res) => {
  const response = await call({
    name: 'ai-kit',
    path: '/api/v1/sdk/status',
    method: 'GET',
    responseType: 'stream',
  });
  res.set('Content-Type', response.headers['content-type']);
  response.data.pipe(res);
});

router.post('/completions', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const response = await call({
    name: 'ai-kit',
    path: '/api/v1/sdk/completions',
    method: 'POST',
    data: req.body,
    responseType: 'stream',
  });
  res.set('Content-Type', response.headers['content-type']);
  response.data.pipe(res);
});

router.post('/image/generations', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const response = await call({
    name: 'ai-kit',
    path: '/api/v1/sdk/image/generations',
    method: 'POST',
    data: req.body,
    responseType: 'stream',
  });
  res.set('Content-Type', response.headers['content-type']);
  response.data.pipe(res);
});

const callInputSchema = Joi.object<
  {
    projectId?: string;
    ref?: string;
    working?: boolean;
    parameters?: { [key: string]: any };
  } & (
    | {
        templateId: string;
        template: undefined;
      }
    | {
        templateId: undefined;
        template: Pick<
          Template,
          | 'type'
          | 'model'
          | 'temperature'
          | 'topP'
          | 'presencePenalty'
          | 'frequencyPenalty'
          | 'prompts'
          | 'datasets'
          | 'branch'
          | 'next'
        >;
      }
  )
>({
  ref: Joi.string(),
  working: Joi.boolean().default(false),
  projectId: Joi.string(),
  templateId: Joi.string(),
  template: Joi.object({
    type: templateSchema.extract('type'),
    model: templateSchema.extract('model'),
    temperature: templateSchema.extract('temperature'),
    topP: Joi.number().min(0.1).max(1).empty(null),
    presencePenalty: Joi.number().min(-2).max(2).empty(null),
    frequencyPenalty: Joi.number().min(-2).max(2).empty(null),
    maxTokens: Joi.number().integer().empty(null),
    prompts: templateSchema.extract('prompts'),
    datasets: templateSchema.extract('datasets'),
    branch: templateSchema.extract('branch'),
    next: templateSchema.extract('next'),
  }),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
}).xor('templateId', 'template');

router.post('/call', compression(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });

  const project = input.projectId ? await Projects.findOne({ where: { _id: input.projectId } }) : undefined;

  const repository = await getRepository({ projectId: input.projectId || 'default' });

  const getTemplateById = (templateId: string) =>
    getTemplate({ repository, ref: input.ref || defaultBranch, working: input.working, templateId });

  const template = input.template ?? (await getTemplateById(input.templateId));

  const startDate = new Date();
  const log = await Log.create({
    templateId: input.templateId,
    hash: input.ref || defaultBranch,
    projectId: input.projectId,
    prompts: template.prompts,
    parameters: input.parameters,
    startDate,
  });

  try {
    const emit = (
      response:
        | { type: 'delta'; delta: string }
        | typeof result
        | { type: 'next'; delta: string; templateId: string; templateName: string }
    ) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
      }

      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.flush();
    };

    const result = await runTemplate(
      project,
      getTemplateById,
      template,
      input.parameters,
      stream
        ? ({
            token,
            isFinalTemplate,
            templateId,
            templateName,
          }: {
            token: string;
            isFinalTemplate: boolean;
            templateId: string;
            templateName: string;
          }) => {
            if (isFinalTemplate) {
              emit({ type: 'delta', delta: token });
            } else {
              emit({
                type: 'next',
                delta: token,
                templateName: templateName || '',
                templateId: templateId || input.templateId || '',
              });
            }
          }
        : undefined,
      log
    );

    if (stream) {
      if (!res.headersSent) {
        emit(result);
      }
      res.end();
    } else {
      res.json(result);
    }

    const endDate = new Date();
    const requestTime = endDate.getTime() - startDate.getTime();
    await log.update({ endDate, requestTime, status: Status.SUCCESS, response: result });
  } catch (error) {
    const endDate = new Date();
    const requestTime = endDate.getTime() - startDate.getTime();
    await log.update({ endDate, requestTime, status: Status.FAIL, error: error.message });
    throw error;
  }
});

async function runTemplate(
  project: Project | undefined | null,
  getTemplate: (templateId: string) => Promise<Template>,
  template: Pick<
    Template,
    | 'name'
    | 'type'
    | 'mode'
    | 'model'
    | 'temperature'
    | 'topP'
    | 'presencePenalty'
    | 'frequencyPenalty'
    | 'maxTokens'
    | 'prompts'
    | 'datasets'
    | 'branch'
    | 'next'
  >,
  parameters:
    | {
        $history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
        [key: string]: any;
      }
    | undefined,
  callback:
    | ((data: { token: string; isFinalTemplate: boolean; templateId: string; templateName: string }) => void)
    | undefined,
  log: Log
): Promise<
  | { type: 'text'; text: string }
  | { type: 'images'; images: ({ url: string; b64_json?: undefined } | { url?: undefined; b64_json?: string })[] }
> {
  let current: (typeof template & { id?: string }) | undefined = template;
  let next: Template | undefined;
  let result: Awaited<ReturnType<typeof runTemplate>> | undefined;

  while (current) {
    const childStartDate = new Date();

    next = current.next?.id ? await getTemplate(current.next.id) : undefined;
    // avoid recursive call
    if (next?.id === current.id) {
      next = undefined;
    }

    const messages = await Promise.all(
      (current.prompts ?? [])
        .filter((i): i is Required<typeof i> => !!i.role && !!i.content && i.visibility !== 'hidden')
        .map(async (item) => {
          // 过滤注释节点
          const content = item.content
            .split(/\n/)
            .filter((x) => !x.startsWith(COMMENT_PREFIX))
            .join('\n');

          const renderTemplate = async (template: string) => {
            return renderAsync(
              template,
              {
                ...parameters,
                callPrompt: () => async (text: string) => {
                  try {
                    const t = await renderTemplate(text);

                    const options = await Joi.object<{ templateId: string; parameters?: object }>({
                      templateId: Joi.string().required(),
                      parameters: Joi.object().pattern(Joi.string(), Joi.any()),
                    }).validateAsync(JSON.parse(t), { stripUnknown: true });
                    const template = await getTemplate(options.templateId);
                    const result = await runTemplate(
                      project,
                      getTemplate,
                      template,
                      options.parameters,
                      (options) => callback?.({ ...options, isFinalTemplate: false }),
                      log
                    );
                    if (result.type === 'text') return result.text;
                  } catch (error) {
                    logger.error('callPrompt error', error);
                  }
                  return '';
                },
              },
              undefined,
              { escape: (v) => v }
            );
          };

          const prompt = await renderTemplate(content);

          return { role: item.role, content: prompt };
        })
    );

    const datasets = await Promise.all(
      current.datasets
        ?.filter((i): i is Required<typeof i> => !!i.vectorStore)
        .map((item) => VectorStore.load(item.vectorStore.id, new AIKitEmbeddings())) ?? []
    );

    const messagesString = messages.map((i) => i.content).join('\n');
    const docs = (
      await Promise.all(datasets.map(async (dataset) => dataset.similaritySearch(messagesString, 4)))
    ).flat();

    const history = (parameters?.$history ?? []).filter((i) => !!i.role && !!i.content);

    const prompt = history.concat(messages);

    const question = (parameters as any)?.question;
    if (
      current.mode === 'chat' &&
      typeof question === 'string' &&
      !current.prompts?.some((i) => i.content && /{{\s*question\s*}}/.test(i.content))
    ) {
      prompt.push({ role: 'user', content: question });
    }

    if (docs.length) {
      const context = docs.map((i) => i.pageContent).join('\n');
      const contextTemplate = `Use the following pieces of context to answer the users question.
  If you don't know the answer, just say that you don't know, don't try to make up an answer.
  ----------------
  ${context}`;
      prompt.unshift({ role: 'system', content: contextTemplate });
    }

    if (current.type === 'branch') {
      const question = parameters?.question;

      const branches = current.branch?.branches.filter((i) => i.template?.name);
      if (!branches || !question) {
        current = next;
        continue;
      }

      prompt.push({
        role: 'system',
        content: `You are a branch selector, don't try to answer the user's question, \
  you need to choose the most appropriate one from the following minutes based on the question entered by the user.
  Branches:
  ${branches.map((i) => `Branch_${i.template!.id}: ${i.description || ''}`).join('\n')}

  Use the following format:

  Question: the input question you must think about
  Thought: you should always consider which branch is more suitable
  Branch: the branch to take, should be one of [${branches.map((i) => `Branch_${i.template!.id}`).join('\n')}]

  Begin!"

  Question: ${question}\
  `,
      });
    }

    if (current.type === 'image') {
      const { size, number } = await Joi.object<{ size: string; number: number }>({
        size: Joi.alternatives()
          .try(Joi.string().valid('256x256', '512x512', '1024x1024'), Joi.any().empty(Joi.any()))
          .empty(Joi.valid(null, ''))
          .default('256x256'),
        number: Joi.number().min(1).max(10).empty(Joi.valid('', null)).default(1),
      }).validateAsync(parameters, { stripUnknown: true });

      const response = await call<{ data: ImagesResponseDataInner[] }>({
        name: 'ai-kit',
        path: '/api/v1/sdk/image/generations',
        method: 'POST',
        data: {
          prompt: prompt.map((i) => i.content).join('\n'),
          size,
          n: number,
          response_format: 'b64_json',
        },
      });

      const images = (response.data.data || []).map((i) => ({ url: `data:image/png;base64,${i.b64_json}` }));

      result = { type: 'images', images };
      break;
    }

    const isFinalTemplate = current.type !== 'branch' && !next;

    const childLog = await Log.create({
      templateId: current?.id,
      prompts: messages,
      parameters,
      parentId: log.id,
      startDate: childStartDate,
    });

    const { data } = await call({
      name: 'ai-kit',
      path: '/api/v1/sdk/completions',
      method: 'POST',
      data: {
        modelName: current.model ?? project?.model,
        temperature: current.temperature ?? project?.temperature,
        topP: current.topP ?? project?.topP,
        presencePenalty: current.presencePenalty ?? project?.presencePenalty,
        frequencyPenalty: current.frequencyPenalty ?? project?.frequencyPenalty,
        maxTokens: current.maxTokens ?? project?.maxTokens,
        stream: true,
        messages: prompt,
      },
      responseType: 'stream',
    });

    let text = '';
    const decoder = new TextDecoder();

    for await (const chunk of data) {
      const token = decoder.decode(chunk);
      callback?.({
        isFinalTemplate,
        token,
        templateId: current?.id || '',
        templateName: current?.name || '',
      });
      text += token;
    }

    result = { type: 'text', text };

    const endDate = new Date();
    const requestTime = endDate.getTime() - childStartDate.getTime();
    await childLog.update({ status: Status.SUCCESS, endDate, requestTime, response: result });

    if (current.type === 'branch') {
      const branchId = text && /Branch_(\w+)/s.exec(text)?.[1]?.trim();
      if (branchId && current.branch?.branches.some((i) => i.template?.id === branchId)) {
        current = await getTemplate(branchId);
        continue;
      }
    }

    if (current.next) {
      const { outputKey } = current.next;
      if (outputKey) {
        // eslint-disable-next-line no-param-reassign
        parameters ??= {};
        parameters[outputKey] = text;
      }
    }

    current = next;
  }

  return result!;
}

export default router;
