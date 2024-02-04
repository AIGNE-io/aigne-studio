import { chatCompletions, imageGenerations, proxyToAIKit } from '@blocklet/ai-kit/api/call';
import { CallAI, GetAssistant, nextTaskId, runAssistant } from '@blocklet/ai-runtime/core';
import { AssistantResponseType, RunAssistantResponse, isPromptAssistant } from '@blocklet/ai-runtime/types';
import user from '@blocklet/sdk/lib/middlewares/user';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { pick } from 'lodash';

import { ensureComponentCallOrAuth, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Log, { Status } from '../store/models/log';
import Project from '../store/models/project';
import { defaultBranch, getAssistantFromRepository, getRepository } from '../store/repository';

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
  projectId: string;
  ref: string;
  working?: boolean;
  assistantId: string;
  parameters?: { [key: string]: any };
}>({
  projectId: Joi.string().required(),
  ref: Joi.string().required(),
  working: Joi.boolean().default(false),
  assistantId: Joi.string().required(),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
});

router.post('/call', user(), compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });

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

  const startDate = new Date();
  const log = await Log.create({
    templateId: input.assistantId,
    hash: input.ref || defaultBranch,
    projectId: input.projectId,
    prompts: isPromptAssistant(assistant) ? assistant.prompts : undefined,
    parameters: input.parameters,
    startDate,
  });

  const emit = (data: RunAssistantResponse) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.flushHeaders();
    }

    res.write(`data: ${JSON.stringify(data)}\n\n`);
    res.flush();
  };

  try {
    const taskId = nextTaskId();

    if (stream) emit({ type: AssistantResponseType.CHUNK, taskId, assistantId: assistant.id, delta: {} });

    const result = await runAssistant({
      callAI,
      callAIImage: ({ input }) => imageGenerations(input),
      taskId,
      getAssistant,
      assistant,
      parameters: input.parameters,
      callback: stream ? emit : undefined,
      user: req.user,
    });

    if (!stream) {
      res.json(result);
    }

    res.end();

    const endDate = new Date();
    const requestTime = endDate.getTime() - startDate.getTime();
    log.update({ endDate, requestTime, status: Status.SUCCESS, response: result });
  } catch (error) {
    if (stream) {
      emit({ type: AssistantResponseType.ERROR, error: pick(error, 'message', 'type', 'timestamp') });
    } else {
      res.status(500).json({ error: { message: error.message } });
    }
    res.end();

    const endDate = new Date();
    const requestTime = endDate.getTime() - startDate.getTime();
    log.update({ endDate, requestTime, status: Status.FAIL, error: error.message });
  }
});

export default router;
