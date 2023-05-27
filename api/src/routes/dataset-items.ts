import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import user from '@blocklet/sdk/lib/middlewares/user';
import axios from 'axios';
import { Router } from 'express';
import Joi from 'joi';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import { AIKitEmbeddings } from '../core/embeddings/ai-kit';
import { ensureAdmin } from '../libs/security';
import { DatasetItem, datasetItems } from '../store/dataset-items';
import VectorStore from '../store/vector-store';

const router = Router();

router.get('/:datasetId/items', ensureAdmin, async (req, res) => {
  const { datasetId } = req.params;
  const [items, total] = await Promise.all([
    datasetItems.cursor({ datasetId }).sort({ createdAt: 1 }).exec(),
    datasetItems.count({ datasetId }),
  ]);

  res.json({
    items,
    total,
  });
});

export interface CreateItem {
  name?: string;
  data?: DatasetItem['data'];
}

export type CreateItemInput = CreateItem | CreateItem[];

const createItemSchema = Joi.object<CreateItem>({
  name: Joi.string().empty(Joi.valid(null, '')),
  data: Joi.object({
    type: Joi.string().valid('discussion').required(),
  }).when(Joi.object({ type: 'discussion' }).unknown(), {
    then: Joi.object({
      id: Joi.string().required(),
    }),
  }),
});

const createItemInputSchema = Joi.alternatives<CreateItemInput>().try(
  Joi.array().items(createItemSchema),
  createItemSchema
);

router.post('/:datasetId/items', user(), ensureAdmin, async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const input = await createItemInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  const arr = Array.isArray(input) ? input : [input];

  const doc = await datasetItems.insert(
    arr.map((item) => ({
      datasetId,
      name: item.name,
      data: item.data,
      createdBy: did,
      updatedBy: did,
    }))
  );
  res.json(Array.isArray(input) ? doc : doc[0]);
});

router.delete('/:datasetId/items/:itemId', user(), ensureAdmin, async (req, res) => {
  const { datasetId, itemId } = req.params;
  if (!datasetId || !itemId) {
    throw new Error('Missing required params `datasetId` or `itemId`');
  }

  await datasetItems.remove({ _id: itemId, datasetId });
  res.json({});
});

const embeddingTasks = new Map<string, Promise<void>>();

const embeddingHandler: {
  [key in NonNullable<DatasetItem['data']>['type']]: (item: DatasetItem & { data: { type: key } }) => Promise<void>;
} = {
  discussion: async (item) => {
    const discussion = await getDiscussion(item.data.id);
    const textSplitter = new RecursiveCharacterTextSplitter();
    const docs = await textSplitter.createDocuments([discussion.content]);

    const embeddings = new AIKitEmbeddings({});
    const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
    const store = await VectorStore.load(item.datasetId, embeddings);
    await store.addVectors(vectors, docs);
    await store.save();
  },
};

router.post('/:datasetId/items/:itemId/embedding', ensureAdmin, async (req, res) => {
  const { datasetId, itemId } = req.params;
  if (!datasetId || !itemId) {
    throw new Error('Missing required params `datasetId` or `itemId`');
  }

  let task = embeddingTasks.get(itemId);
  if (!task) {
    task = (async () => {
      const item = await datasetItems.findOne({ _id: itemId });
      if (!item) throw new Error(`Dataset item ${itemId} not found`);
      if (!item.data) return;

      const handler = embeddingHandler[item.data.type];
      if (!handler) return;

      try {
        await handler(item as any);
        await datasetItems.update(
          { _id: itemId },
          {
            $set: {
              embeddedAt: new Date().toISOString(),
              error: null,
            },
          }
        );
      } catch (error) {
        await datasetItems.update(
          { _id: itemId },
          {
            $set: {
              embeddedAt: new Date().toISOString(),
              error: error.message,
            },
          }
        );
        throw error;
      } finally {
        embeddingTasks.delete(itemId);
      }
    })();

    embeddingTasks.set(itemId, task);
  }

  await task;

  res.json({});
});

export default router;

async function getDiscussion(discussionId: string): Promise<{ content: string }> {
  const url = getComponentWebEndpoint('z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!url) {
    throw new Error('did-comments component not found');
  }

  const { data } = await axios.get(`/api/blogs/${discussionId}`, { baseURL: url, params: { textContent: 1 } });
  if (!data) {
    throw new Error('Discussion not found');
  }

  return data;
}
