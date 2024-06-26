import { ReadableStream } from 'stream/web';

import { getAgent, getMemoryVariables } from '@api/libs/agent';
import { uploadImageToImageBin } from '@api/libs/image-bin';
import logger from '@api/libs/logger';
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
import { defaultImageModel, getSupportedImagesModels } from '@blocklet/ai-runtime/common';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CallAI, CallAIImage, RunAssistantCallback, RuntimeExecutor, nextTaskId } from '@blocklet/ai-runtime/core';
import { AssistantResponseType, RuntimeOutputVariable, isImageAssistant } from '@blocklet/ai-runtime/types';
import { RuntimeError, RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import { auth } from '@blocklet/sdk/lib/middlewares';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { pick } from 'lodash';

const router = Router();

const callInputSchema = Joi.object<{
  blockletDid?: string;
  working?: boolean;
  aid: string;
  sessionId: string;
  inputs?: { [key: string]: any };
}>({
  blockletDid: Joi.string().empty(['', null]),
  working: Joi.boolean().empty(['', null]).default(false),
  aid: Joi.string().required(),
  sessionId: Joi.string().required(),
  inputs: Joi.object({
    $clientTime: Joi.string().isoDate().empty([null, '']),
  }).pattern(Joi.string(), Joi.any()),
}).rename('parameters', 'inputs', { ignoreUndefined: true, override: true });

router.post('/call', user(), auth(), compression(), async (req, res) => {
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

  const userId = req.user?.did;
  if (!userId) throw new Error('Missing required userId');

  const { projectId, projectRef, assistantId } = parseIdentity(input.aid, { rejectWhenError: true });

  const usage = {
    promptTokens: 0,
    completionTokens: 0,
  };

  const callAI: CallAI = async ({ input }) => {
    const stream = await chatCompletions({ ...input });

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

  const agent = await getAgent({
    blockletDid: input.blockletDid,
    projectId,
    projectRef,
    working: input.working,
    agentId: assistantId,
    rejectOnEmpty: true,
  });

  let mainTaskId: string | undefined;
  let error: { type?: string; message: string } | undefined;

  const outputs: History['outputs'] = {};

  const executingLogs: { [key: string]: NonNullable<History['steps']>[number] } = {};

  const taskId = nextTaskId();

  const history = await History.create({
    userId,
    projectId,
    agentId: assistantId,
    sessionId: input.sessionId,
    inputs: input.inputs,
    status: 'generating',
  });

  const emit: RunAssistantCallback = (input) => {
    const data = { ...input, messageId: history.id };

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
    emit({
      type: AssistantResponseType.INPUT_PARAMETER,
      taskId,
      assistantId: agent.id,
      delta: {
        content: JSON.stringify(input.inputs, null, 2),
      },
    });

    const executor = new RuntimeExecutor({
      getSecret: ({ targetProjectId, targetAgentId, targetInputKey }) =>
        Secrets.findOne({
          where: { projectId, targetProjectId, targetAgentId, targetInputKey },
          rejectOnEmpty: new RuntimeError(RuntimeErrorType.MissingSecretError, 'Missing required secret'),
        }),
      callback: emit,
      callAI,
      callAIImage,
      getMemoryVariables,
      getAgent,
      entryProjectId: projectId,
      user: { id: userId, did: userId, ...req.user },
      sessionId: input.sessionId,
    });

    const result = await executor.execute(agent, {
      inputs: input.inputs,
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
      const question = input.inputs?.question;
      if (question && typeof question === 'string') {
        const session = await Session.findByPk(input.sessionId);
        await session?.update({ name: input.inputs?.question });
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
