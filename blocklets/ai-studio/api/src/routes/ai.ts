import { ReadableStream } from 'stream/web';

import { defaultImageModel, getSupportedImagesModels } from '@api/libs/common';
import { uploadImageToImageBin } from '@api/libs/image-bin';
import logger from '@api/libs/logger';
import { getAssistantFromResourceBlocklet } from '@api/libs/resource';
import AgentInputSecret from '@api/store/models/agent-input-secret';
import History from '@api/store/models/history';
import Session from '@api/store/models/session';
import { chatCompletions, imageGenerations, proxyToAIKit } from '@blocklet/ai-kit/api/call';
import {
  ChatCompletionChunk,
  ChatCompletionResponse,
  isChatCompletionChunk,
  isChatCompletionUsage,
} from '@blocklet/ai-kit/api/types/index';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CallAI, CallAIImage, GetAssistant, RuntimeExecutor, nextTaskId } from '@blocklet/ai-runtime/core';
import {
  AssistantResponseType,
  RunAssistantResponse,
  RuntimeOutputVariable,
  isImageAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';

import { ensureComponentCallOrAuth, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { getAssistantFromRepository, getRepository, getVariablesFromRepository } from '../store/repository';

const router = Router();

const defaultModel = 'gpt-3.5-turbo';

router.get('/status', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/status'));

router.post(
  '/:type(chat)?/completions',
  ensureComponentCallOrPromptsEditor(),
  proxyToAIKit('/api/v1/chat/completions')
);

router.post('/image/generations', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/image/generations'));

const callInputSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  blockletDid?: string;
  aid: string;
  working?: boolean;
  parameters?: { [key: string]: any };
  debug?: boolean;
}>({
  userId: Joi.string().empty(['', null]),
  sessionId: Joi.string().empty(['', null]),
  blockletDid: Joi.string().empty(['', null]),
  aid: Joi.string().required(),
  working: Joi.boolean().default(false),
  parameters: Joi.object({
    $clientTime: Joi.string().isoDate().empty([null, '']),
  }).pattern(Joi.string(), Joi.any()),
  debug: Joi.boolean().default(false),
});

router.post('/call', user(), compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(
    {
      ...req.body,
      // 兼容旧版的接口参数，一段时间后删掉下面这行
      aid:
        req.body.aid ??
        stringifyIdentity({
          projectId: req.body.projectId,
          projectRef: req.body.ref,
          assistantId: req.body.assistantId,
        }),
    },
    { stripUnknown: true }
  );

  const userId = req.user?.did || input.userId;
  if (!userId) throw new Error('Missing required userId');

  const { projectId, projectRef, assistantId } = parseIdentity(input.aid, { rejectWhenError: true });

  const project = await Project.findByPk(projectId, {
    rejectOnEmpty: new Error(`Project ${projectId} not found`),
  });

  const repository = await getRepository({ projectId });

  const usage = {
    promptTokens: 0,
    completionTokens: 0,
  };

  const callAI: CallAI = async ({ assistant, input }) => {
    const promptAssistant = isPromptAssistant(assistant) ? assistant : undefined;

    const model = {
      model: input.model || promptAssistant?.model || project.model || defaultModel,
      temperature: input.temperature ?? promptAssistant?.temperature ?? project.temperature,
      topP: input.topP ?? promptAssistant?.topP ?? project.topP,
      presencePenalty: input.presencePenalty ?? promptAssistant?.presencePenalty ?? project.presencePenalty,
      frequencyPenalty: input.frequencyPenalty ?? promptAssistant?.frequencyPenalty ?? project.frequencyPenalty,
    };
    const stream = await chatCompletions({
      ...input,
      ...model,
      // FIXME: should be maxTokens - prompt tokens
      // maxTokens: input.maxTokens ?? project.maxTokens,
    });

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (isChatCompletionUsage(chunk)) {
              usage.promptTokens += chunk.usage.promptTokens;
              usage.completionTokens += chunk.usage.completionTokens;
            }

            controller.enqueue(chunk);
          }
        } catch (error) {
          controller.error(error);
        }
        controller.close();
      },
    });
  };

  const callAIImage: CallAIImage = async ({ assistant, input }) => {
    const imageAssistant = isImageAssistant(assistant) ? assistant : undefined;
    const supportImages = await getSupportedImagesModels();
    const imageModel = supportImages.find((i) => i.model === (imageAssistant?.model || defaultImageModel));

    const model = {
      model: input.model || imageModel?.model,
      n: input.n || imageModel?.nDefault,
      quality: input.quality || imageModel?.qualityDefault,
      style: input.style || imageModel?.styleDefault,
      size: input.size || imageModel?.sizeDefault,
    };
    const imageRes = await imageGenerations({
      ...input,
      ...model,
      responseFormat: 'b64_json',
    }).then(async (res) => ({
      data: await Promise.all(
        res.data.map(async (item) => ({
          url: (await uploadImageToImageBin({ filename: `AI Generate ${Date.now()}.png`, data: item, userId })).url,
        }))
      ),
    }));

    return imageRes;
  };

  const getAssistant: GetAssistant = async (fileId: string, options) => {
    const blockletDid = options?.blockletDid || input.blockletDid;
    if (!blockletDid || !options?.projectId) {
      const assistant = await getAssistantFromRepository({
        repository,
        ref: projectRef,
        working: input.working,
        assistantId: fileId,
        rejectOnEmpty: options?.rejectOnEmpty as any,
      });
      return { ...assistant, project: { id: projectId } };
    }

    const assistant = await getAssistantFromResourceBlocklet({
      blockletDid,
      projectId: options.projectId,
      assistantId: fileId,
      type: ['application', 'tool', 'llm-adapter', 'aigc-adapter', 'knowledge'],
    });
    if (options.rejectOnEmpty && !assistant?.assistant) throw new Error(`No such assistant ${fileId}`);

    return { ...assistant?.assistant!, project: { id: options.projectId } };
  };

  const assistant = await getAssistant(assistantId, { projectId, blockletDid: input.blockletDid, rejectOnEmpty: true });

  let mainTaskId: string | undefined;
  let error: { type?: string; message: string } | undefined;

  const result: History['result'] = {};

  const childMessagesMap: { [id: string]: NonNullable<(typeof result)['messages']>[number] } = {};

  const executingLogs: { [key: string]: NonNullable<History['executingLogs']>[number] } = {};

  const emit = (data: RunAssistantResponse) => {
    if (data.type === AssistantResponseType.CHUNK || data.type === AssistantResponseType.INPUT) {
      if (data.type === AssistantResponseType.CHUNK) {
        mainTaskId ??= data.taskId;
        if (mainTaskId === data.taskId) {
          if (data.delta.content) result.content = (result.content || '') + data.delta.content;
          if (data.delta.images?.length) result.images = (result.images || []).concat(data.delta.images);

          if (data.delta.object) {
            result.objects ??= [];
            result.objects.push({ taskId: data.taskId, data: data.delta.object });
          }
        } else if (data.respondAs && data.respondAs !== 'none') {
          let childMsg = childMessagesMap[data.taskId];
          if (!childMsg) {
            childMsg = { taskId: data.taskId, respondAs: data.respondAs };
            childMessagesMap[data.taskId] = childMsg;
            result.messages ??= [];
            result.messages.push(childMsg);
          }

          childMsg.result ??= {};
          childMsg.result.content = (childMsg.result.content || '') + (data.delta.content || '');
          if (data.delta?.images?.length) {
            childMsg.result.images = (childMsg.result.images ?? []).concat(data.delta.images);
          }
        }
      }

      executingLogs[data.taskId] ??= {
        taskId: data.taskId,
        assistantId: data.assistantId,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };

      const log = executingLogs[data.taskId]!;

      // 最后一次 callback 时间作为 task 结束时间
      log.endTime = new Date().toISOString();

      if (data.type === AssistantResponseType.CHUNK) {
        if (data.delta.content) log.content = (log.content || '') + data.delta.content;
        if (data.delta.images?.length) log.images = (log.images || []).concat(data.delta.images);
      } else if (data.type === AssistantResponseType.INPUT) {
        log.input = data.apiArgs;
      }
    } else if (data.type === AssistantResponseType.ERROR) {
      error = data.error;
    }

    if (!stream) return;

    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.flush();
  };

  const taskId = nextTaskId();

  if (stream) emit({ type: AssistantResponseType.CHUNK, taskId, assistantId: assistant.id, delta: {} });

  const history = userId
    ? await History.create({
        userId,
        taskId,
        projectId,
        ref: projectRef,
        assistantId,
        sessionId: input.sessionId,
        parameters: input.parameters,
        generateStatus: 'generating',
      })
    : undefined;

  try {
    // 传入全局的存储变量
    const data = await getVariablesFromRepository({
      repository,
      ref: projectRef,
      working: input.working,
      fileName: 'variable',
      rejectOnEmpty: true,
    });

    emit({
      type: AssistantResponseType.INPUT_PARAMETER,
      taskId,
      assistantId: assistant.id,
      delta: {
        content: JSON.stringify(input.parameters),
      },
    });

    const executor = new RuntimeExecutor({
      getSecret: ({ targetProjectId, targetAgentId, targetInputKey }) =>
        AgentInputSecret.findOne({
          where: { projectId, targetProjectId, targetAgentId, targetInputKey },
          rejectOnEmpty: new Error('No such secret'),
        }),
      callback: emit,
      callAI,
      callAIImage,
      getAgent: getAssistant,
      entryProjectId: projectId,
      user: { id: userId, did: userId, ...req.user },
      // FIXME: create a temporary session
      sessionId: input.sessionId || nanoid(),
      datastoreVariables: data.variables || [],
    });

    const result = await executor.execute(assistant, {
      inputs: input.parameters,
      taskId,
    });

    const llmResponseStream =
      result?.[RuntimeOutputVariable.llmResponseStream] instanceof ReadableStream
        ? result[RuntimeOutputVariable.llmResponseStream]
        : undefined;

    if (llmResponseStream) {
      let text = '';
      let calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']> | undefined;

      for await (const chunk of llmResponseStream as ReadableStream<ChatCompletionResponse>) {
        if (isChatCompletionChunk(chunk)) {
          text += chunk.delta.content || '';

          const { toolCalls } = chunk.delta;

          if (toolCalls) {
            if (!calls) {
              calls = toolCalls;
            } else {
              toolCalls.forEach((item, index) => {
                const call = calls?.[index];
                if (call?.function) {
                  call.function.name += item.function?.name || '';
                  call.function.arguments += item.function?.arguments || '';
                }
              });
            }
          }

          if (stream) {
            emit({
              type: AssistantResponseType.CHUNK,
              taskId,
              assistantId: assistant.id,
              delta: { content: chunk.delta.content },
            });
          }
        }
      }

      if (stream) {
        emit({
          type: AssistantResponseType.CHUNK,
          taskId,
          assistantId: assistant.id,
          delta: {
            object: {
              $llmResponse: {
                content: text,
                toolCalls: calls,
              },
            },
          },
        });
      }

      result[RuntimeOutputVariable.llmResponseStream] = text;
    }

    if (!stream) {
      res.json(result);
    }

    res.end();

    if (input.sessionId) {
      const question = input.parameters?.question;
      if (question && typeof question === 'string') {
        const session = await Session.findByPk(input.sessionId);
        await session?.update({ name: input.parameters?.question });
      }
    }
  } catch (e) {
    logger.error('run assistant error', { error: e });
    let fetchErrorMsg = e?.response?.data?.error;
    if (typeof fetchErrorMsg !== 'string') fetchErrorMsg = fetchErrorMsg?.message;

    error = { ...pick(e, 'type', 'timestamp'), message: fetchErrorMsg || e.message };
    if (stream) {
      emit({ type: AssistantResponseType.ERROR, error });
    } else {
      res.status(500).json({ error });
    }
    res.end();
  }

  await history?.update({
    error,
    result,
    generateStatus: 'done',
    executingLogs: Object.values(executingLogs),
    usage:
      usage.promptTokens || usage.completionTokens
        ? { ...usage, totalTokens: usage.promptTokens + usage.completionTokens }
        : undefined,
  });
});

export default router;
