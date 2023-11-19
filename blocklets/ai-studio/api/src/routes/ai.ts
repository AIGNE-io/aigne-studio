import { COMMENT_PREFIX } from '@blocklet/prompt-editor/utils';
import { call } from '@blocklet/sdk/lib/component';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { ImagesResponseDataInner } from 'openai';
import { NodeVM } from 'vm2';

import { AIKitEmbeddings } from '../core/embeddings/ai-kit';
import Mustache from '../libs/mustache';
import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import Log, { Status } from '../store/models/logs';
import Projects from '../store/models/projects';
import { Project, defaultBranch, getRepository } from '../store/projects';
import {
  CallMessage,
  PromptMessage,
  Role,
  Template,
  getTemplate,
  isCallAPIMessage,
  isCallDatasetMessage,
  isCallFuncMessage,
  isCallPromptMessage,
  isPromptMessage,
} from '../store/templates';
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

type TokenType = { token: string; isFinalTemplate: boolean; templateId: string; templateName: string };
type CallType = { type: 'call'; templateId: string; variableName: string; result: string };

type ResponseSSE = TokenType | CallType;

function isPromptTypeOutput(data: TokenType | CallType): data is TokenType {
  return (data as TokenType).token !== undefined;
}

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
        // FIXME: deprecated next call, remove it after migration.
        | { type: 'next'; delta: string; templateId: string; templateName: string }
        | { type: 'call'; delta: string; templateId: string; variableName: string }
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
        ? (data: ResponseSSE) => {
            if (isPromptTypeOutput(data)) {
              const { token, isFinalTemplate, templateId, templateName } = data;
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
            } else {
              emit({
                type: 'call',
                templateId: data.templateId || '',
                variableName: data.variableName,
                delta: data.result,
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
        $history?: { role: Role; content: string }[];
        [key: string]: any;
      }
    | undefined,
  callback: ((data: ResponseSSE) => void) | undefined,
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

    const renderMessage = async (message: string) => {
      return Mustache.render(message, variables, undefined, { escape: (v) => v });
    };
    const vm = new NodeVM({
      console: 'inherit',
      sandbox: {
        context: {
          get: (name: any) => {
            let result = variables[name];
            while (typeof result === 'function') {
              result = result();
            }

            return result;
          },
        },
      },
    });

    const variablesCache: { [key: string]: Promise<string> } = {};

    const emitCall = ({ item, result }: { item: CallMessage; result: string | object }) => {
      callback?.({
        type: 'call',
        templateId: current?.id || '',
        variableName: item.output,
        result: result ? JSON.stringify(result) : result,
      });
    };

    const variables = {
      ...parameters,
      ...Object.fromEntries(
        (current.prompts ?? []).filter(isCallPromptMessage).map((item) => [
          item.output,
          () => async () => {
            variablesCache[item.output] ??= (async () => {
              if (!item.template) throw new Error('Required property `template` is not present');
              const template = await getTemplate(item.template.id);
              const result = await runTemplate(
                project,
                getTemplate,
                template,
                Object.fromEntries(
                  await Promise.all(
                    Object.entries(item.parameters ?? {}).map(async ([key, val]) => [
                      key,
                      typeof val === 'string' ? await renderMessage(val) : val,
                    ])
                  )
                ),
                (options) => callback?.({ ...options, isFinalTemplate: false }),
                log
              );

              emitCall({ item, result });

              if (result.type === 'text') return result.text;
              throw new Error(`Unsupported response from call prompt ${result.type}`);
            })();
            return variablesCache[item.output];
          },
        ])
      ),
      ...Object.fromEntries(
        (current.prompts ?? []).filter(isCallAPIMessage).map((item) => [
          item.output,
          () => async () => {
            variablesCache[item.output] ??= (async () => {
              if (!item.url) throw new Error('Required property `url` is not present');

              const url = await renderMessage(item.url);
              const params: { method: string; body?: string } = { method: item.method };

              if (item.body && ['post', 'put', 'patch', 'delete'].includes(item.method)) {
                params.body = await renderMessage(item.body);
              }

              const response = await fetch(url, params);

              if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}`);
              }

              const contentType = response.headers.get('Content-Type');
              const result = contentType?.includes('application/json') ? await response.json() : await response.text();
              emitCall({ item, result });

              return result;
            })();
            return variablesCache[item.output];
          },
        ])
      ),
      ...Object.fromEntries(
        (current.prompts ?? []).filter(isCallFuncMessage).map((item) => [
          item.output,
          () => async () => {
            variablesCache[item.output] ??= (async () => {
              if (!item.code) return '';

              const functionInSandbox = vm.run(`module.exports = async function() { ${item.code} }`);
              const result = await functionInSandbox();

              emitCall({ item, result });

              return result;
            })();
            return variablesCache[item.output];
          },
        ])
      ),
      ...Object.fromEntries(
        (current.prompts ?? []).filter(isCallDatasetMessage).map((item) => [
          item.output,
          () => async () => {
            variablesCache[item.output] ??= (async () => {
              if (!item.vectorStore) return '';

              if (!item.parameters?.query) {
                throw new Error('dataset search parameters is required');
              }

              const messagesString = await renderMessage(item.parameters.query);

              const dataset = await VectorStore.load(item.vectorStore.id, new AIKitEmbeddings());
              const docs = await dataset.similaritySearch(messagesString, 4);
              const result = docs.map((doc) => doc.pageContent).join('\n');

              emitCall({ item, result });

              return result;
            })();
            return variablesCache[item.output];
          },
        ])
      ),
    };

    const messages = await Promise.all(
      (current.prompts ?? [])
        .filter(
          (i): i is PromptMessage & Required<Pick<PromptMessage, 'role' | 'content'>> =>
            isPromptMessage(i) && !!i.content && i.visibility !== 'hidden'
        )
        .map(async (item) => {
          // 过滤注释节点
          const content = item.content
            .split(/\n/)
            .filter((x) => !x.startsWith(COMMENT_PREFIX))
            .join('\n');

          const prompt = await renderMessage(content);

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
    if (current.mode === 'chat' && typeof question === 'string') {
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
