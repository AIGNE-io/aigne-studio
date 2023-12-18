import {
  CallAI,
  RunAssistantResponse,
  callAIKitChatCompletions,
  nextTaskId,
  runAssistant,
} from '@blocklet/ai-runtime/core';
import { isPromptAssistant } from '@blocklet/ai-runtime/types';
import { call } from '@blocklet/sdk/lib/component';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAuth, ensureComponentCallOrPromptsEditor } from '../libs/security';
import Log, { Status } from '../store/models/log';
import Project from '../store/models/project';
import { defaultBranch, getAssistantFromRepository, getRepository } from '../store/repository';

const router = Router();

const defaultModel = 'gpt-3.5-turbo';

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

router.post('/call', compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });

  const project = await Project.findByPk(input.projectId, {
    rejectOnEmpty: new Error(`Project ${input.projectId} not found`),
  });

  const repository = await getRepository({ projectId: input.projectId });

  const callAI: CallAI = ({ assistant, input }) => {
    const promptAssistant = isPromptAssistant(assistant) ? assistant : undefined;

    return callAIKitChatCompletions({
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

    if (stream) emit({ taskId, assistantId: assistant.id, delta: {} });

    const result = await runAssistant({
      callAI,
      taskId,
      getAssistant,
      assistant,
      parameters: input.parameters,
      callback: stream ? emit : undefined,
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
      emit({ error: { message: error.message } });
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
