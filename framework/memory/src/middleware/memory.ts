import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { Memory } from '../core';
import OpenAIManager from '../llm/openai';

const apiKey = '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';

const messageSchema = Joi.object({
  role: Joi.string().required(),
  content: Joi.string().required(),
});

const optionsSchema = Joi.object({
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  metadata: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
});

const requestSchema = Joi.object({
  messages: Joi.array().items(messageSchema).required(),
  options: optionsSchema.optional(),
});

const searchOptionsSchema = Joi.object({
  k: Joi.number().integer().min(1).optional(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
});

const searchRequestSchema = Joi.object({
  query: Joi.string().required(),
  options: searchOptionsSchema.optional(),
});

export function memoryRoutes(router: Router, path: string) {
  const loadMemory = Memory.load({ path });

  router.post('/add', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { messages, options } = await requestSchema.validateAsync(req.body, { stripUnknown: true });
    const result = await memory.add(messages, options);
    res.json(result);
  });

  router.post('/search', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { query, options } = await searchRequestSchema.validateAsync(req.body, { stripUnknown: true });
    const result = await memory.search(query, options);
    res.json(result);
  });

  router.post('/run', compression(), async (req, res) => {
    const { messages, options } = await requestSchema.validateAsync(req.body, { stripUnknown: true });

    const memory = await loadMemory;
    const llm = new OpenAIManager({ apiKey });

    const memories = await memory.search(JSON.stringify(messages), options);
    console.log('memories', JSON.stringify(memories.results, null, 2));

    const response = await llm.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: '你是一个TODO助手, 请根据用户输入生成TODO列表, 支持新增,修改,删除等功能' },
        memories.results.length
          ? { role: 'system', content: `this is the memories: ${JSON.stringify(memories, null, 2)}` }
          : null,
        ...messages,
      ].filter(Boolean),
      temperature: 0,
    });
    const assistantMessage = response.choices[0].message.content;
    console.log('assistantMessage', assistantMessage);

    const result = await memory.add([...messages, { role: 'assistant', content: assistantMessage }], options);
    console.log('result', JSON.stringify(result, null, 2));

    res.json(assistantMessage);
  });

  return router;
}
