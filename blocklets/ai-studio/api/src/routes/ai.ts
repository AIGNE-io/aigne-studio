import { call } from '@blocklet/sdk/lib/component';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { Callbacks } from 'langchain/callbacks';
import { LLMChain } from 'langchain/chains';
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { ChatCompletionRequestMessage, ImagesResponseDataInner } from 'openai';

import { AIKitEmbeddings } from '../core/embeddings/ai-kit';
import { AIKitChat } from '../core/llms/ai-kit-chat';
import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { defaultBranch, getRepository } from '../store/projects';
import { Template, getTemplate } from '../store/templates';
import VectorStore from '../store/vector-store';
import { templateSchema } from './templates';

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
    parameters?: { [key: string]: any };
  } & (
    | {
        ref?: string;
        templateId: string;
        template: undefined;
      }
    | {
        ref: undefined;
        templateId: undefined;
        template: Pick<Template, 'type' | 'model' | 'temperature' | 'prompts' | 'datasets' | 'branch' | 'next'>;
      }
  )
>({
  ref: Joi.string(),
  projectId: Joi.string(),
  templateId: Joi.string(),
  template: Joi.object({
    type: templateSchema.extract('type'),
    model: templateSchema.extract('model'),
    temperature: templateSchema.extract('temperature'),
    prompts: templateSchema.extract('prompts'),
    datasets: templateSchema.extract('datasets'),
    branch: templateSchema.extract('branch'),
    next: templateSchema.extract('next'),
  }),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
}).xor('templateId', 'template');

router.post('/call', compression(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callInputSchema.validateAsync(req.body, { stripUnknown: true });

  const repository = await getRepository({ projectId: input.projectId || 'default' });

  const getTemplateById = (templateId: string) =>
    getTemplate({ repository, ref: input.ref || defaultBranch, templateId });

  const template = input.template ?? (await getTemplateById(input.templateId));
  const emit = (response: { type: 'delta'; delta: string } | typeof result) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.flushHeaders();
    }

    res.write(`data: ${JSON.stringify(response)}\n\n`);
    res.flush();
  };

  const result = await runTemplate(
    getTemplateById,
    template,
    input.parameters,
    stream
      ? [
          {
            handleLLMNewToken(token) {
              emit({ type: 'delta', delta: token });
            },
          },
        ]
      : undefined
  );

  if (stream) {
    if (!res.headersSent) {
      emit(result);
    }
    res.end();
  } else {
    res.json(result);
  }
});

class StaticPromptTemplate extends PromptTemplate {
  constructor(template: string) {
    super({ template, inputVariables: [], validateTemplate: false });
  }

  override async format(): Promise<string> {
    return this.template;
  }
}

async function runTemplate(
  getTemplate: (templateId: string) => Promise<Template>,
  template: Pick<Template, 'type' | 'model' | 'temperature' | 'prompts' | 'datasets' | 'branch' | 'next'>,
  parameters?: {
    $history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
    [key: string]: any;
  },
  callbacks?: Callbacks
): Promise<
  | { type: 'text'; text: string }
  | { type: 'images'; images: ({ url: string; b64_json?: undefined } | { url?: undefined; b64_json?: string })[] }
> {
  let current: (typeof template & { id?: string }) | undefined = template;
  let next: Template | undefined;
  let result: Awaited<ReturnType<typeof runTemplate>> | undefined;

  while (current) {
    next = current.next?.id ? await getTemplate(current.next.id) : undefined;
    // avoid recursive call
    if (next?.id === current.id) {
      next = undefined;
    }

    const matchParams = (template: string) => [
      ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
    ];

    const messages: ChatCompletionRequestMessage[] = (current.prompts ?? [])
      .filter((i): i is Required<typeof i> => !!i.role && !!i.content)
      .map((item) => {
        const params = matchParams(item.content);
        let { content } = item;
        for (const param of params) {
          content = content.replace(new RegExp(`{{\\s*(${param})\\s*}}`, 'g'), parameters?.[param]?.toString() || '');
        }

        return { role: item.role, content };
      });

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

    const prompt = ChatPromptTemplate.fromPromptMessages(
      history.concat(messages).map(({ role, content }) => {
        const Message = {
          system: SystemMessagePromptTemplate,
          user: HumanMessagePromptTemplate,
          assistant: AIMessagePromptTemplate,
        }[role];

        return new Message(new StaticPromptTemplate(content));
      })
    );

    if (docs.length) {
      const contextTemplate = `Use the following pieces of context to answer the users question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`;
      prompt.promptMessages.unshift(SystemMessagePromptTemplate.fromTemplate(contextTemplate));
    }

    if (current.type === 'branch') {
      const question = parameters?.question;

      const branches = current.branch?.branches.filter((i) => i.template?.name);
      if (!branches || !question) {
        current = next;
        continue;
      }

      prompt.promptMessages.push(
        SystemMessagePromptTemplate.fromTemplate(
          `You are a branch selector, don't try to answer the user's question, \
you need to choose the most appropriate one from the following minutes based on the question entered by the user.
Branches:
${branches.map((i) => `Branch_${i.template!.id}: ${i.description || ''}`).join('\n')}

Use the following format:

Question: the input question you must think about
Thought: you should always consider which branch is more suitable
Branch: the branch to take, should be one of [${branches.map((i) => `Branch_${i.template!.id}`).join('\n')}]

Begin!"

Question: ${question}\
`
        )
      );
    }

    if (current.type === 'image') {
      const { size, number } = await Joi.object<{ size: string; number: number }>({
        size: Joi.alternatives()
          .try(Joi.string().valid('256x256', '512x512', '1024x1024'), Joi.any().empty(Joi.any()))
          .empty(Joi.valid(null, ''))
          .default('256x256'),
        number: Joi.number().min(1).max(10).empty(Joi.valid('', null)).default(1),
      }).validateAsync(parameters, { stripUnknown: true });

      const response = await call<{ data: ImagesResponseDataInner[] }>({
        name: 'ai-kit',
        path: '/api/v1/sdk/image/generations',
        method: 'POST',
        data: {
          prompt: (
            await prompt.formatMessages({
              context: docs.map((i) => i.pageContent).join('\n'),
            })
          )
            .map((i) => i.text)
            .join('\n'),
          size,
          n: number,
          response_format: 'b64_json',
        },
      });

      const images = (response.data.data || []).map((i) => ({ url: `data:image/png;base64,${i.b64_json}` }));

      result = { type: 'images', images };
      break;
    }

    const model = new AIKitChat({
      modelName: current.model,
      temperature: current.temperature,
    });

    const chain = new LLMChain({
      llm: model,
      prompt,
    });

    const isFinalTemplate = current.type !== 'branch' && !next;

    const { text } = await chain.call(
      { context: docs.map((i) => i.pageContent).join('\n') },
      isFinalTemplate ? callbacks : undefined
    );
    result = { type: 'text', text };

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
