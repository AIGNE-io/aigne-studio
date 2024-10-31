import { ReadableStream } from 'stream/web';

import { getAgent, getMemoryVariables, getProject } from '@api/libs/agent';
import { uploadImageToImageBin } from '@api/libs/image-bin';
import logger from '@api/libs/logger';
import ExecutionCache from '@api/store/models/execution-cache';
import History from '@api/store/models/history';
import Secrets from '@api/store/models/secret';
import Session from '@api/store/models/session';
import { chatCompletions, imageGenerations } from '@blocklet/ai-kit/api/call';
import {
  ChatCompletionChunk,
  ChatCompletionResponse,
  isChatCompletionChunk,
  isChatCompletionUsage,
} from '@blocklet/ai-kit/api/types/index';
import { defaultImageModel, defaultTextModel, getSupportedImagesModels } from '@blocklet/ai-runtime/common';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CallAI, CallAIImage, RunAssistantCallback, RuntimeExecutor, nextTaskId } from '@blocklet/ai-runtime/core';
import { toolCallsTransform } from '@blocklet/ai-runtime/core/utils/tool-calls-transform';
import { AssistantResponseType, RuntimeOutputVariable, isImageAssistant } from '@blocklet/ai-runtime/types';
import { RuntimeError, RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import { getUserPassports, quotaChecker } from '@blocklet/aigne-sdk/api/premium';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { omitBy, pick } from 'lodash';
import { Op } from 'sequelize';

const router = Router();

const callInputSchema = Joi.object<{
  entryAid?: string;
  aid: string;
  working?: boolean;
  sessionId?: string;
  inputs?: { [key: string]: any };
  debug?: boolean;
  appUrl?: string;
}>({
  entryAid: Joi.string().empty(['', null]),
  aid: Joi.string().required(),
  working: Joi.boolean().empty(['', null]).default(false),
  sessionId: Joi.string().empty(['', null]),
  inputs: Joi.object({
    $clientTime: Joi.string().isoDate().empty([null, '']),
  }).pattern(Joi.string(), Joi.any()),
  debug: Joi.boolean().empty(['', null]),
  appUrl: Joi.string().empty(['', null]),
}).rename('parameters', 'inputs', { ignoreUndefined: true, override: true });

const checkProjectRequestLimit = async ({
  userId,
  role,
  blockletDid,
  projectId,
}: {
  userId: string;
  role?: string;
  blockletDid?: string;
  projectId: string;
}) => {
  const project = await getProject({ blockletDid, projectId, rejectOnEmpty: true });

  // 不限制自己创建的项目
  if (project.createdBy && project.createdBy === userId) {
    return;
  }
  const historyCount = await History.count({
    where: { projectId, error: null, userId: { [Op.not]: project.createdBy } },
  });
  if (
    !quotaChecker.checkRequestLimit(historyCount, await getUserPassports(userId)) &&
    !['owner', 'admin', 'promptsEditor'].includes(role || '')
  ) {
    throw new RuntimeError(
      RuntimeErrorType.ProjectRequestExceededError,
      `Project request limit exceeded (current: ${historyCount}, limit: ${quotaChecker.getQuota('requestLimit', role)})`
    );
  }
};

router.post('/call', user(), compression(), async (req, res) => {
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
          agentId: req.body.assistantId,
        }),
    },
    { stripUnknown: true }
  );

  const userId = req.user?.did;

  const { blockletDid, projectId, projectRef, agentId } = parseIdentity(input.aid, { rejectWhenError: true });

  const agent = await getAgent({
    aid: input.aid,
    working: input.working,
    rejectOnEmpty: true,
  });
  if (!agent.access?.noLoginRequired && !userId) {
    res.status(401).json({ error: { message: 'Unauthorized' } });
    return;
  }

  const usage = {
    promptTokens: 0,
    completionTokens: 0,
  };

  const project = await getProject({ blockletDid, projectId, projectRef, working: input.working, rejectOnEmpty: true });

  const callAI: CallAI = async ({ input }) => {
    const stream = await chatCompletions({
      ...input,
      model: input.model || project.model || defaultTextModel,
      temperature: input.temperature || project.temperature,
      topP: input.topP || project.topP,
      frequencyPenalty: input.frequencyPenalty || project.frequencyPenalty,
      presencePenalty: input.presencePenalty || project.presencePenalty,
      // maxTokens: input.maxTokens || project?.maxTokens,
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
    return imageGenerations({
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
  };

  let mainTaskId: string | undefined;
  let error: { type?: string; message: string } | undefined;

  const outputs: History['outputs'] = {};

  const executingLogs: { [key: string]: NonNullable<History['steps']>[number] } = {};

  const taskId = nextTaskId();

  const sessionId =
    input.sessionId ??
    (
      await Session.create({
        userId,
        projectId,
        agentId: input.entryAid ? parseIdentity(input.entryAid, { rejectWhenError: true }).agentId : agentId,
      })
    ).id;

  const history = await History.create({
    userId,
    projectId,
    agentId,
    sessionId,
    inputs: input.inputs,
    status: 'generating',
    blockletDid,
    projectRef,
  });

  const emit: RunAssistantCallback = (response) => {
    // skip debug message in production
    if (!input.debug && response.type !== AssistantResponseType.ERROR) {
      if (response.type !== AssistantResponseType.CHUNK || (mainTaskId && response.taskId !== mainTaskId)) {
        return;
      }
    }

    const data = { ...response, messageId: history.id, sessionId };

    if (data.type === AssistantResponseType.CHUNK || data.type === AssistantResponseType.INPUT) {
      if (data.type === AssistantResponseType.CHUNK) {
        mainTaskId ??= data.taskId;
        if (mainTaskId === data.taskId) {
          if (data.delta.content) {
            outputs.content = (outputs.content || '') + data.delta.content;
          }

          if (data.delta.object) {
            outputs.objects ??= [];
            outputs.objects.push(data.delta.object);
          }
        }
      }

      executingLogs[data.taskId] ??= {
        id: data.taskId,
        agentId: data.assistantId,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };

      const log = executingLogs[data.taskId]!;

      // 最后一次 callback 时间作为 task 结束时间
      log.endTime = new Date().toISOString();

      if (data.type === AssistantResponseType.CHUNK) {
        if (data.delta.object) {
          log.objects ??= [];
          log.objects.push(data.delta.object);
        }
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

  if (stream) emit({ type: AssistantResponseType.CHUNK, taskId, assistantId: agent.id, delta: {} });

  try {
    await checkProjectRequestLimit({ userId, role: req.user?.role, blockletDid, projectId });

    emit({
      type: AssistantResponseType.INPUT_PARAMETER,
      taskId,
      assistantId: agent.id,
      delta: {
        content: JSON.stringify(input.inputs, null, 2),
      },
    });

    const executor = new RuntimeExecutor(
      {
        entry: {
          blockletDid,
          project,
          working: input.working,
          appUrl: input.appUrl,
        },
        getSecret: ({ targetProjectId, targetAgentId, targetInputKey }) =>
          Secrets.findOne({
            where: { projectId, targetProjectId, targetAgentId, targetInputKey },
            rejectOnEmpty: new RuntimeError(RuntimeErrorType.MissingSecretError, 'Missing required secret'),
          }),
        callback: emit,
        callAI,
        callAIImage,
        getMemoryVariables: (options) =>
          getMemoryVariables({ ...options, working: options.projectId === projectId ? input.working : undefined }),
        getAgent: (options) => {
          const identity = parseIdentity(options.aid, { rejectWhenError: true });

          return getAgent({
            ...options,
            aid: stringifyIdentity({
              ...identity,
              // NOTE: 仅允许调用当前项目或者 resource blocklet 中的 agent
              projectId: identity.blockletDid ? identity.projectId : projectId,
            }),
            working: identity.projectId === projectId ? input.working : undefined,
          } as Parameters<typeof getAgent>[0]);
        },
        entryProjectId: projectId,
        user: userId ? { id: userId, did: userId, ...req.user } : undefined,
        sessionId,
        messageId: history.id,
        clientTime: input.inputs?.$clientTime || new Date().toISOString(),
        queryCache: ({ aid, cacheKey }) => {
          const { blockletDid, projectId, projectRef, agentId } = parseIdentity(aid, { rejectWhenError: true });
          return ExecutionCache.findOne({
            where: omitBy({ blockletDid, projectId, projectRef, agentId, cacheKey }, (v) => v === undefined),
          });
        },
        setCache: ({ aid, cacheKey, inputs, outputs }) => {
          const { blockletDid, projectId, projectRef, agentId } = parseIdentity(aid, { rejectWhenError: true });

          return ExecutionCache.create({ blockletDid, projectId, projectRef, agentId, cacheKey, inputs, outputs });
        },
      },
      agent,
      {
        inputs: input.inputs,
        taskId,
      }
    );

    const result = await executor.execute();

    const llmResponseStream =
      result?.[RuntimeOutputVariable.llmResponseStream] instanceof ReadableStream
        ? result[RuntimeOutputVariable.llmResponseStream]
        : undefined;

    if (llmResponseStream) {
      let text = '';
      const calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']> = [];

      for await (const chunk of llmResponseStream as ReadableStream<ChatCompletionResponse>) {
        if (isChatCompletionChunk(chunk)) {
          text += chunk.delta.content || '';
          toolCallsTransform(calls, chunk);

          if (stream) {
            emit({
              type: AssistantResponseType.CHUNK,
              taskId,
              assistantId: agent.id,
              delta: { content: chunk.delta.content },
            });
          }
        }
      }

      if (stream) {
        emit({
          type: AssistantResponseType.CHUNK,
          taskId,
          assistantId: agent.id,
          delta: {
            object: {
              $llmResponse: {
                content: text,
                toolCalls: calls.length ? calls : undefined,
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
      const question = input.inputs?.question;
      if (question && typeof question === 'string') {
        const session = await Session.findByPk(input.sessionId);
        await session?.update({ name: input.inputs?.question });
      }
    }
  } catch (e) {
    logger.error('run assistant error', e);
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
    outputs,
    status: 'done',
    steps: Object.values(executingLogs),
    usage:
      usage.promptTokens || usage.completionTokens
        ? { ...usage, totalTokens: usage.promptTokens + usage.completionTokens }
        : undefined,
  });
});

export default router;
