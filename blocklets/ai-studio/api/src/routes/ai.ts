import { stringifyIdentity } from '@api/libs/aid';
import { defaultImageModel, getSupportedImagesModels } from '@api/libs/common';
import { InvalidSubscriptionError, ReachMaxRoundLimitError } from '@api/libs/error';
import { uploadImageToImageBin } from '@api/libs/image-bin';
import { getActiveSubscriptionOfAssistant, reportUsage } from '@api/libs/payment';
import History from '@api/store/models/history';
import Release from '@api/store/models/release';
import Session from '@api/store/models/session';
import { chatCompletions, imageGenerations, proxyToAIKit } from '@blocklet/ai-kit/api/call';
import { CallAI, CallAIImage, GetAssistant, nextTaskId, runAssistant } from '@blocklet/ai-runtime/core';
import {
  AssistantResponseType,
  RunAssistantResponse,
  isImageAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { pick } from 'lodash';

import { ensureComponentCallOrAuth, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { getAssistantFromRepository, getRepository, getVariablesFromRepository } from '../store/repository';

const router = Router();

const defaultModel = 'gpt-3.5-turbo';

router.get('/status', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/status'));

router.post(
  '/:type(chat)?/completions',
  ensureComponentCallOrPromptsEditor(),
  proxyToAIKit('/api/v1/sdk/chat/completions' as any)
);

router.post('/image/generations', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/image/generations'));

const callInputSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  projectId: string;
  ref: string;
  working?: boolean;
  assistantId: string;
  parameters?: { [key: string]: any };
  debug?: boolean;
}>({
  userId: Joi.string().empty(['', null]),
  sessionId: Joi.string().empty(['', null]),
  projectId: Joi.string().required(),
  ref: Joi.string().required(),
  working: Joi.boolean().default(false),
  assistantId: Joi.string().required(),
  parameters: Joi.object({
    $clientTime: Joi.string().isoDate().empty([null, '']),
  }).pattern(Joi.string(), Joi.any()),
  debug: Joi.boolean().default(false),
});

router.post('/call', user(), compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });
  const userId = req.user?.did || input.userId;

  const project = await Project.findByPk(input.projectId, {
    rejectOnEmpty: new Error(`Project ${input.projectId} not found`),
  });

  const repository = await getRepository({ projectId: input.projectId });

  const callAI: CallAI = async ({ assistant, input, outputModel = false }) => {
    const promptAssistant = isPromptAssistant(assistant) ? assistant : undefined;

    const model = {
      model: input.model || promptAssistant?.model || project.model || defaultModel,
      temperature: input.temperature ?? promptAssistant?.temperature ?? project.temperature,
      topP: input.topP ?? promptAssistant?.topP ?? project.topP,
      presencePenalty: input.presencePenalty ?? promptAssistant?.presencePenalty ?? project.presencePenalty,
      frequencyPenalty: input.frequencyPenalty ?? promptAssistant?.frequencyPenalty ?? project.frequencyPenalty,
    };
    const chatCompletionChunk = await chatCompletions({
      ...input,
      ...model,
      // FIXME: should be maxTokens - prompt tokens
      // maxTokens: input.maxTokens ?? project.maxTokens,
    });

    if (outputModel) {
      return {
        chatCompletionChunk,
        modelInfo: model,
      };
    }
    return chatCompletionChunk as any;
  };

  const callAIImage: CallAIImage = async ({ assistant, input, outputModel = false }) => {
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
          url: (await uploadImageToImageBin({ filename: `AI Generate ${Date.now()}.png`, data: item })).url,
        }))
      ),
    }));

    if (outputModel) {
      return {
        imageRes,
        modelInfo: model,
      };
    }
    return imageRes as any;
  };

  const getAssistant: GetAssistant = (fileId: string, options) => {
    return getAssistantFromRepository({
      repository,
      ref: input.ref,
      working: input.working,
      assistantId: fileId,
      rejectOnEmpty: options?.rejectOnEmpty as any,
    });
  };

  const assistant = await getAssistant(input.assistantId, { rejectOnEmpty: true });

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
        projectId: input.projectId,
        ref: input.ref,
        assistantId: input.assistantId,
        sessionId: input.sessionId,
        parameters: input.parameters,
        generateStatus: 'generating',
      })
    : undefined;

  const release = await Release.findOne({
    where: {
      projectId: input.projectId,
      projectRef: input.ref,
      assistantId: input.assistantId,
      paymentEnabled: true,
    },
  });

  try {
    if (assistant.release?.maxRoundLimit && input.sessionId) {
      const rounds = await History.count({ where: { userId, sessionId: input.sessionId } });
      if (rounds > assistant.release.maxRoundLimit) {
        throw new ReachMaxRoundLimitError('Max round limitation has been reached');
      }
    }

    let debug = false;
    if (input.debug && userId) {
      if ([project.createdBy].includes(userId) && ['owner', 'admin'].includes(req.user?.role || '')) {
        debug = true;
      }
    }

    if (!debug && userId && release?.paymentEnabled && release.paymentProductId) {
      if (
        !(await getActiveSubscriptionOfAssistant({
          aid: stringifyIdentity({ projectId: input.projectId, projectRef: input.ref, assistantId: input.assistantId }),
          userId,
        }))
      ) {
        throw new InvalidSubscriptionError('Your subscription is not available');
      }
    }

    // 传入全局的存储变量
    const data = await getVariablesFromRepository({
      repository,
      ref: input.ref,
      working: input.working,
      fileName: 'variable',
      rejectOnEmpty: true,
    });

    const result = await runAssistant({
      callAI,
      callAIImage,
      taskId,
      getAssistant,
      assistant,
      parameters: input.parameters,
      callback: stream ? emit : undefined,
      user: userId ? { id: userId, did: userId, ...req.user } : undefined,
      sessionId: input.sessionId,
      projectId: input.projectId,
      datastoreVariables: data?.variables || [],
    });

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

  await history?.update({ error, result, generateStatus: 'done', executingLogs: Object.values(executingLogs) });

  if (userId && release?.paymentEnabled && release.paymentProductId) {
    await reportUsage({ projectId: input.projectId, projectRef: input.ref, assistantId: input.assistantId, userId });
  }
});

export default router;
