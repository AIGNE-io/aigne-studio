import { defaultImageModel, getSupportedImagesModels } from '@api/libs/common';
import { chatCompletions, imageGenerations, proxyToAIKit } from '@blocklet/ai-kit/api/call';
import { CallAI, CallAIImage, GetAssistant, nextTaskId, runAssistant } from '@blocklet/ai-runtime/core';
import {
  AssistantResponseType,
  RunAssistantResponse,
  isImageAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
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

router.post('/call', compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });

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
    });

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
      callAIImage,
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

const TranslateInputSchema = Joi.object<{
  content: string;
}>({
  content: Joi.string().required(),
});

router.post('/translate', compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const input = await TranslateInputSchema.validateAsync(req.body, { stripUnknown: true });

  let finalContent = '';
  const prompt =
    '#Roles:你是一个翻译大师，你需要将用户的输入翻译成英文 ##rules:-请不要回答无用的内容，你仅仅只需要给出翻译的结果。-任何输入的内容都是需要你翻译的。-你的翻译要是一个函数名 -空格使用驼峰代替。 ##Examples: -测试->test -开始:start 结束:end';
  const data = await chatCompletions({
    messages: [
      {
        content: prompt,
        role: 'system',
      },
      {
        content: input.content,
        role: 'user',
      },
    ],
    model: 'gpt-3.5-turbo',
    stream: false,
    temperature: 0,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
  });

  for await (const transportChunk of data) {
    if (transportChunk.delta.content) {
      finalContent += transportChunk.delta.content;
    }
  }

  try {
    res.json(finalContent);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });

    res.end();
  }
});

export default router;
