import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import user from '@blocklet/sdk/lib/middlewares/user';
import axios from 'axios';
import { Router } from 'express';
import SSE from 'express-sse';
import Joi from 'joi';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import omit from 'lodash/omit';

import { AIKitEmbeddings } from '../core/embeddings/ai-kit';
import logger from '../libs/logger';
import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { DatasetItem } from '../store/dataset-items';
import DatasetItems from '../store/models/dataset-items';
import EmbeddingHistories from '../store/models/embedding-history';
import VectorStore from '../store/vector-store';

const router = Router();

const paginationSchema = Joi.object<{ page: number; size: number }>({
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(20),
});

router.get('/:datasetId/items', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) throw new Error('Missing required params `datasetId`');

  const { page, size } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const [items, total] = await Promise.all([
    DatasetItems.findAll({
      order: [['createdAt', 'ASC']],
      where: { datasetId },
      offset: (page - 1) * size,
      limit: size,
    }),
    DatasetItems.count({
      where: { datasetId },
    }),
  ]);

  res.json({ items, total });
});

const sse = new SSE();

router.get('/:datasetId/embeddings', ensureComponentCallOrPromptsEditor(), (req, res) => {
  sse.init(req, res);

  sse.send(
    {
      list: [...embeddingTasks.entries()].map(([itemId, task]) => ({ itemId, ...omit(task, 'promise') })),
    },
    'list'
  );
});

export interface CreateItem {
  name: string;
  data: DatasetItem['data'];
}

export type CreateItemInput = CreateItem | CreateItem[];

const createItemSchema = Joi.object<CreateItem>({
  name: Joi.string().required(),
  data: Joi.object({
    type: Joi.string().valid('discussion').required(),
  })
    .when(Joi.object({ type: 'discussion' }).unknown(), {
      then: Joi.object({
        fullSite: Joi.boolean().valid(true),
        id: Joi.string(),
      }).xor('fullSite', 'id'),
    })
    .required(),
});

const createItemInputSchema = Joi.alternatives<CreateItemInput>().try(
  Joi.array().items(createItemSchema),
  createItemSchema
);

router.post('/:datasetId/items', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  const arr = Array.isArray(input) ? input : [input];

  const docs = await Promise.all(
    arr.map(async (item) => {
      const found = await DatasetItems.findOne({ where: { datasetId, data: item.data } });
      if (found) {
        return found.update({ ...item, createdBy: did, updatedBy: did }, { where: { datasetId, data: item.data } });
      }

      return DatasetItems.create({ ...item, datasetId, createdBy: did, updatedBy: did });
    })
  );

  res.json(Array.isArray(input) ? docs : docs[0]);
});

router.delete('/:datasetId/items/:itemId', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId, itemId } = req.params;
  if (!datasetId || !itemId) {
    throw new Error('Missing required params `datasetId` or `itemId`');
  }

  await DatasetItems.destroy({ where: { _id: itemId, datasetId } });

  res.json({});
});

const embeddingTasks = new Map<string, { promise: Promise<void>; current?: number; total?: number }>();

async function embeddingDiscussionItem({ datasetId, discussionId }: { datasetId: string; discussionId: string }) {
  try {
    const discussion = await getDiscussion(discussionId);

    const previousEmbedding = await EmbeddingHistories.findOne({ where: { targetId: discussionId } });
    if (previousEmbedding?.targetVersion) {
      if (new Date(previousEmbedding?.targetVersion).toISOString() === new Date(discussion.updatedAt).toISOString()) {
        return;
      }
    }

    const textSplitter = new RecursiveCharacterTextSplitter();
    const docs = await textSplitter.createDocuments([discussion.content]);

    const embeddings = new AIKitEmbeddings({});
    const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
    const store = await VectorStore.load(datasetId, embeddings);
    await store.addVectors(vectors, docs);
    await store.save();

    if (await EmbeddingHistories.findOne({ where: { targetId: discussionId } })) {
      await EmbeddingHistories.update(
        { targetVersion: new Date(discussion.updatedAt) },
        { where: { targetId: discussionId } }
      );
    } else {
      await EmbeddingHistories.create({ targetVersion: new Date(discussion.updatedAt) });
    }
  } catch (error) {
    if (await EmbeddingHistories.findOne({ where: { targetId: discussionId } })) {
      await EmbeddingHistories.update({ error: error.message }, { where: { targetId: discussionId } });
    } else {
      await EmbeddingHistories.create({ error: error.message });
    }
  }
}

async function embeddingDiscussion({ datasetId }: { datasetId: string }, { itemId }: { itemId?: string } = {}) {
  for await (const { id: discussionId, index: current, total } of discussionsIterator()) {
    if (itemId) {
      const task = embeddingTasks.get(itemId);
      if (task) {
        Object.assign(task, { total, current });
        sse.send({ itemId, total, current }, 'change');
      }
    }
    try {
      await embeddingDiscussionItem({ datasetId, discussionId });
    } catch (error) {
      logger.error(`embedding discussion ${discussionId} error`, error);
    }
  }
}

const embeddingHandler: {
  [key in NonNullable<DatasetItem['data']>['type']]: (item: DatasetItem & { data: { type: key } }) => Promise<void>;
} = {
  discussion: async (item) => {
    if (item.data.fullSite) {
      await embeddingDiscussion({ datasetId: item.datasetId }, { itemId: item._id! });
    } else {
      await embeddingDiscussionItem({ datasetId: item.datasetId, discussionId: item.data.id });
    }
  },
};

router.post('/:datasetId/items/:itemId/embedding', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const { datasetId, itemId } = req.params;
  if (!datasetId || !itemId) {
    throw new Error('Missing required params `datasetId` or `itemId`');
  }

  let task = embeddingTasks.get(itemId);
  if (!task) {
    task = {
      promise: (async () => {
        const item = await DatasetItems.findOne({ where: { _id: itemId } });
        if (!item) throw new Error(`Dataset item ${itemId} not found`);
        if (!item.data) return;

        const handler = embeddingHandler[item.data.type];
        if (!handler) return;

        try {
          await handler(item as any);
          await DatasetItems.update(
            {
              embeddedAt: new Date(),
              error: '',
            },
            { where: { _id: itemId } }
          );
        } catch (error) {
          await DatasetItems.update(
            {
              embeddedAt: new Date(),
              error: error.message,
            },
            { where: { _id: itemId } }
          );

          throw error;
        } finally {
          embeddingTasks.delete(itemId);
          sse.send({ itemId }, 'complete');
        }
      })(),
    };

    embeddingTasks.set(itemId, task);
    sse.send({ itemId }, 'change');
  }

  await task.promise;

  res.json({});
});

export default router;

const discussBaseUrl = () => {
  const url = getComponentWebEndpoint('z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!url) {
    throw new Error('did-comments component not found');
  }
  return url;
};

async function getDiscussion(discussionId: string): Promise<{ content: string; updatedAt: string }> {
  const { data } = await axios.get(`/api/blogs/${discussionId}`, {
    baseURL: discussBaseUrl(),
    params: { textContent: 1 },
  });
  if (!data) {
    throw new Error('Discussion not found');
  }

  return data;
}

async function* discussionsIterator() {
  let page = 0;
  let index = 0;
  const size = 2;

  while (true) {
    page += 1;
    const { data, total } = await searchDiscussions({ page, size });
    if (!data.length) {
      break;
    }
    for (const i of data) {
      index += 1;
      yield { total, id: i.id, index };
    }
  }
}

async function searchDiscussions({
  search,
  page,
  size,
}: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<{ data: { id: string }[]; total: number }> {
  return axios
    .get('/api/discussions', {
      baseURL: discussBaseUrl(),
      params: { page, size, search },
    })
    .then((res) => res.data);
}
