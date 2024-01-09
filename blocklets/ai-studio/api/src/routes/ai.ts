import { uploadImageToImageBin } from '@api/libs/image-bin';
import History from '@api/store/models/history';
import { chatCompletions, imageGenerations, proxyToAIKit } from '@blocklet/ai-kit/api/call';
import { isRunAssistantChunk, isRunAssistantError, isRunAssistantInput } from '@blocklet/ai-runtime/api';
import { CallAI, RunAssistantResponse, nextTaskId, runAssistant } from '@blocklet/ai-runtime/core';
import { isPromptAssistant } from '@blocklet/ai-runtime/types';
import { user } from '@blocklet/sdk/lib/middlewares';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAuth, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { getAssistantFromRepository, getRepository } from '../store/repository';

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
  projectId: string;
  ref: string;
  working?: boolean;
  assistantId: string;
  parameters?: { [key: string]: any };
}>({
  userId: Joi.string().empty(['', null]),
  projectId: Joi.string().required(),
  ref: Joi.string().required(),
  working: Joi.boolean().default(false),
  assistantId: Joi.string().required(),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
});

router.post('/call', compression(), user(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });
  const userId = req.user?.did || input.userId;

  const project = await Project.findByPk(input.projectId, {
    rejectOnEmpty: new Error(`Project ${input.projectId} not found`),
  });

  const repository = await getRepository({ projectId: input.projectId });

  const callAI: CallAI = ({ assistant, input }) => {
    const promptAssistant = isPromptAssistant(assistant) ? assistant : undefined;

    return chatCompletions({
      ...input,
      model: input.model || promptAssistant?.model || project.model || defaultModel,
      temperature: input.temperature ?? promptAssistant?.temperature ?? project.temperature,
      topP: input.topP ?? promptAssistant?.topP ?? project.topP,
      presencePenalty: input.presencePenalty ?? promptAssistant?.presencePenalty ?? project.presencePenalty,
      frequencyPenalty: input.frequencyPenalty ?? promptAssistant?.frequencyPenalty ?? project.frequencyPenalty,
      // FIXME: should be maxTokens - prompt tokens
      // maxTokens: input.maxTokens ?? project.maxTokens,
    });
  };

  const getAssistant = (fileId: string) => {
    return getAssistantFromRepository({
      repository,
      ref: input.ref,
      working: input.working,
      assistantId: fileId,
    });
  };

  const assistant = await getAssistant(input.assistantId);

  const history = userId
    ? await History.create({
        userId,
        projectId: input.projectId,
        ref: input.ref,
        assistantId: input.assistantId,
        parameters: input.parameters,
        generateStatus: 'generating',
      })
    : undefined;

  let mainTaskId: string | undefined;
  let error: { message: string } | undefined;
  const result: { content?: string; images?: { url: string }[] } = {};
  const executingLogs: { [key: string]: NonNullable<History['executingLogs']>[number] } = {};

  const handleChunk = (data: RunAssistantResponse) => {
    if (isRunAssistantChunk(data) || isRunAssistantInput(data)) {
      if (isRunAssistantChunk(data)) {
        mainTaskId ??= data.taskId;
        if (mainTaskId === data.taskId) {
          if (data.delta.content) result.content = (result.content || '') + data.delta.content;
          if (data.delta.images?.length) result.images = (result.images || []).concat(data.delta.images);
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

      if (isRunAssistantChunk(data)) {
        if (data.delta.content) log.content = (log.content || '') + data.delta.content;
        if (data.delta.images?.length) log.images = (log.images || []).concat(data.delta.images);
      } else if (isRunAssistantInput(data)) {
        log.input = data.input;
      }
    } else if (isRunAssistantError(data)) {
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

  try {
    const taskId = nextTaskId();

    handleChunk({ taskId, assistantId: assistant.id, delta: {} });

    const result = await runAssistant({
      callAI,
      callAIImage: ({ input }) =>
        imageGenerations({ ...input, responseFormat: 'b64_json' }).then(async (res) => ({
          data: await Promise.all(
            res.data.map(async (item) => ({
              url: (await uploadImageToImageBin({ filename: `AI Generate ${Date.now()}.png`, data: item })).url,
            }))
          ),
        })),
      taskId,
      getAssistant,
      assistant,
      parameters: input.parameters,
      callback: handleChunk,
    });

    if (!stream) {
      res.json(result);
    }

    res.end();
  } catch (error) {
    if (stream) {
      handleChunk({ error: { message: error.message } });
    } else {
      res.status(500).json({ error: { message: error.message } });
    }
    res.end();
  }

  await history?.update({ error, result, generateStatus: 'done', executingLogs: Object.values(executingLogs) });
});

export default router;
