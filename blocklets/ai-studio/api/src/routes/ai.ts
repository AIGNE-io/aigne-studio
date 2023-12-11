import { Mustache } from '@blocklet/ai-runtime/types';
import { COMMENT_PREFIX } from '@blocklet/prompt-editor/utils';
import { call, getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import { sign } from '@blocklet/sdk/lib/util/verify-sign';
import axios from 'axios';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import isNil from 'lodash/isNil';
import fetch from 'node-fetch';
import { ImagesResponseDataInner } from 'openai';
import { joinURL } from 'ufo';
import { NodeVM } from 'vm2';

import { AIKitEmbeddings } from '../core/embeddings/ai-kit';
import { ensureComponentCallOrAuth, ensureComponentCallOrPromptsEditor } from '../libs/security';
import {
  CallAPIMessage,
  CallFuncMessage,
  CallPromptMessage,
  PromptMessage,
  Role,
  Template,
  getTemplate,
  isCallAPIMessage,
  isCallDatasetMessage,
  isCallFuncMessage,
  isCallMacroMessage,
  isCallPromptMessage,
  isPromptMessage,
} from '../store/0.1.157/templates';
import VectorStore from '../store/0.1.157/vector-store';
import Log, { Status } from '../store/models/logs';
import Projects from '../store/models/projects';
import { Project, defaultBranch, getRepository } from '../store/projects';

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
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
}).xor('templateId', 'template');

type TokenType = { token: string; isFinalTemplate: boolean; templateId: string; templateName: string };
type CallType = { type: 'call'; templateId: string; variableName: string; result: string };

type ResponseSSE = TokenType | CallType;

function isPromptTypeOutput(data: TokenType | CallType): data is TokenType {
  return (data as TokenType).token !== undefined;
}

router.post('/call', compression(), ensureComponentCallOrAuth(), async (req, res) => {
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

function formatFunctionCallName(dataList: string[]): {
  id: string;
  type: string;
  name: string;
  content: string[];
  arguments: string;
} {
  let functionName = '';
  let allArguments = '';
  let id = '';
  let type = '';
  const content = [];

  for (const dataString of dataList) {
    if (dataString && dataString.trim()) {
      try {
        const dataObject = JSON.parse(dataString.substring(dataString.indexOf('{')));
        const toolCalls = dataObject.delta?.toolCalls;

        if (!isNil(dataObject.delta.content)) {
          content.push(dataObject.delta.content);
        }

        if (toolCalls && Array.isArray(toolCalls)) {
          for (const call of toolCalls) {
            if (call.id) {
              id = call.id;
            }

            if (call.type) {
              type = call.type;
            }

            if (call.type === 'function' && call.function) {
              if (!functionName) {
                functionName = call.function.name;
              }
            }

            // 拼接arguments
            allArguments += call.function.arguments;
          }
        }
      } catch (error) {
        console.error('Error parsing data:', error);
      }
    }
  }

  return { content, id, type, arguments: allArguments, name: functionName };
}

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
    | 'tools'
  >,
  parameters:
    | {
        $history?: {
          role: Role;
          content: string;
          name?: string;
          toolCallId?: string;
          toolCalls?: {
            id: string;
            type: string;
            function: {
              name: string;
              arguments: string;
            };
          }[];
        }[];
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

    const renderMessage = async (message: string, parameterVariables?: typeof parameters) => {
      return Mustache.render(message, parameterVariables || variables, undefined, { escape: (v) => v });
    };

    const variablesCache: { [key: string]: Promise<string> } = {};

    const emitCall = ({ item, result }: { item: { output: string }; result: string | object }) => {
      callback?.({
        type: 'call',
        templateId: current?.id || '',
        variableName: item.output,
        result: result ? JSON.stringify(result) : result,
      });
    };

    const executingAPIFn = async (item: CallAPIMessage, args?: any) => {
      const url = await renderMessage(item.url);
      const params: { method: string; body?: string } = { method: item.method };

      const body = args ?? item.body;
      if (body && ['post', 'put', 'patch', 'delete'].includes(item.method)) {
        params.body = await renderMessage(body);
      }

      const response = await fetch(url, params);

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type');
      const result: any = contentType?.includes('application/json') ? await response.json() : await response.text();

      return result;
    };

    const executingFuncFn = async (item: CallFuncMessage, args?: any) => {
      const vm = new NodeVM({
        console: 'inherit',
        sandbox: {
          context: {
            get: (name: any) => {
              let result = args[name] || variables[name];

              while (typeof result === 'function') {
                result = result();
              }

              return result;
            },
          },
          fetch,
          parameters: args || {},
        },
      });

      const functionInSandbox = vm.run(`module.exports = async function() { ${item.code} }`);
      const result = await functionInSandbox();
      return result;
    };

    const executingPromptFn = async (item: CallPromptMessage, args?: any) => {
      if (!item.template) throw new Error('Required property `template` is not present');
      const template = await getTemplate(item.template.id);
      const parameters = args ?? item.parameters ?? {};

      const result = await runTemplate(
        project,
        getTemplate,
        template,
        Object.fromEntries(
          await Promise.all(
            Object.entries(parameters).map(async ([key, val]) => [
              key,
              !val ? variables[key] : typeof val === 'string' ? await renderMessage(val) : val,
            ])
          )
        ),
        (options) => callback?.({ ...options, isFinalTemplate: false }),
        log
      );

      return result;
    };

    const variables = {
      ...parameters,
      ...Object.fromEntries(
        (current.prompts ?? []).filter(isCallPromptMessage).map((item) => [
          item.output,
          () => async () => {
            variablesCache[item.output] ??= (async () => {
              const result = await executingPromptFn(item);

              if (result.type === 'text') {
                emitCall({ item: { output: `Prompt Called: ${item.output}` }, result: result.text });
                return result.text;
              }

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

              const result = await executingAPIFn(item);
              emitCall({ item: { output: `API Called: ${item.output}` }, result });

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

              const result = await executingFuncFn(item);
              emitCall({ item: { output: `Code Called: ${item.output}` }, result });

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

              emitCall({ item: { output: `Dataset Called: ${item.output}` }, result });

              return result;
            })();
            return variablesCache[item.output];
          },
        ])
      ),
      ...Object.fromEntries(
        (current.prompts ?? []).filter(isCallMacroMessage).map((item) => [
          item.output,
          () => async () => {
            variablesCache[item.output] ??= (async () => {
              if (!item.template) throw new Error('Required property `template` is not present');
              const template = await getTemplate(item.template.id);

              const parameters = Object.fromEntries(
                await Promise.all(
                  Object.entries(item.parameters ?? {}).map(async ([key, val]) => [
                    key,
                    !val ? variables[key] : typeof val === 'string' ? await renderMessage(val) : val,
                  ])
                )
              );

              const messages = await Promise.all(
                (template.prompts ?? [])
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

                    const prompt = await renderMessage(content, parameters);

                    return { content: prompt };
                  })
              );

              const result = messages.map((x) => x.content).join('\n');
              emitCall({ item: { output: `Macro Called: ${item.output}` }, result });

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
      // eslint-disable-next-line no-await-in-loop
      const { size, number, model } = await Joi.object<{ size: string; number: number; model: 'string' }>({
        model: Joi.string().valid('dall-e-3', 'dall-e-2').empty(Joi.valid('', null)).default('dall-e-2'),
        size: Joi.when('model', {
          is: 'dall-e-3',
          then: Joi.alternatives()
            .try(Joi.string().valid('1024x1024', '1024x1792', '1792x1024'), Joi.any().empty(Joi.any()))
            .empty(Joi.valid(null, ''))
            .default('1024x1024'),
          otherwise: Joi.alternatives()
            .try(Joi.string().valid('256x256', '512x512', '1024x1024'), Joi.any().empty(Joi.any()))
            .empty(Joi.valid(null, ''))
            .default('256x256'),
        }),
        number: Joi.when('model', {
          is: 'dall-e-3',
          then: Joi.number().valid(1).empty(Joi.valid('', null)).default(1),
          otherwise: Joi.number().min(1).max(10).empty(Joi.valid('', null)).default(1),
        }),
      }).validateAsync({ ...parameters, model: current?.model }, { stripUnknown: true });

      // eslint-disable-next-line no-await-in-loop
      const response = await call<{ data: ImagesResponseDataInner[] }>({
        name: 'ai-kit',
        path: '/api/v1/sdk/image/generations',
        method: 'POST',
        data: {
          size,
          model,
          n: number,
          response_format: 'b64_json',
          prompt: prompt.map((i) => i.content).join('\n'),
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

    const callGPT = async () => {
      if (!current) {
        throw new Error('template is null');
      }

      while (true) {
        const input = {
          modelName: current.model ?? project?.model,
          temperature: current.temperature ?? project?.temperature,
          topP: current.topP ?? project?.topP,
          presencePenalty: current.presencePenalty ?? project?.presencePenalty,
          frequencyPenalty: current.frequencyPenalty ?? project?.frequencyPenalty,
          maxTokens: current.maxTokens ?? project?.maxTokens,
          stream: true,
          messages: prompt,
          tools: current.tools
            ? current.tools.map((item) => {
                return {
                  type: 'function',
                  function: item.function,
                };
              })
            : undefined,
          tool_choice: current.tools ? 'auto' : undefined,
        };

        // eslint-disable-next-line no-await-in-loop
        const { data } = await axios.post(
          joinURL(getComponentWebEndpoint('ai-kit'), '/api/v1/sdk/completions'),
          input,
          {
            method: 'POST',
            responseType: 'stream',
            headers: { Accept: 'text/event-stream', 'x-component-sig': sign(input) },
          }
        );

        const list = [];
        const decoder = new TextDecoder();
        for await (const chunk of data) {
          const token = decoder.decode(chunk);
          list.push(...token.split('\n\n').filter(Boolean));
        }

        const format = formatFunctionCallName(list.filter(Boolean));

        const name = format?.name;
        const args = format?.arguments;
        if (name && current.tools) {
          let functionArgs;
          try {
            functionArgs = args ? JSON.parse(args) : undefined;
          } catch (error) {
            functionArgs = undefined;
          }

          const func = current.tools.find((i) => i.function.name === name);
          if (!func) {
            throw new Error(`No ${name} function is currently provided`);
          }

          let result;
          if (isCallAPIMessage(func.extraInfo)) {
            result = await executingAPIFn(func.extraInfo, functionArgs);
          } else if (isCallFuncMessage(func.extraInfo)) {
            result = await executingFuncFn(func.extraInfo, functionArgs);
          } else if (isCallPromptMessage(func.extraInfo)) {
            result = await executingPromptFn(func.extraInfo, functionArgs);
          }

          if (result) {
            emitCall({ item: { output: `tools ${name || ''} called` }, result });

            // 其实就是 data[0] 的数据
            prompt.push({
              role: 'assistant',
              content: '',
              toolCalls: [
                {
                  id: format.id,
                  type: format.type,
                  function: { name, arguments: functionArgs ? JSON.stringify(functionArgs) : '' },
                },
              ],
            });

            prompt.push({ role: 'tool', content: JSON.stringify(result), toolCallId: format.id });
          }
        } else {
          return format.content;
        }
      }
    };

    const data = await callGPT();

    let text = '';
    for (const token of data) {
      callback?.({ token, isFinalTemplate, templateId: current?.id || '', templateName: current?.name || '' });
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
