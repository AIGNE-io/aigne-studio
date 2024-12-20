import { Config, StoreConfig } from './config';
import { migrate } from './migrate';
import { init as initKnowledgeDocument } from './models/document';
import { init as initDatasetEmbeddingHistory } from './models/embedding-history';
import { init as initKnowledgeSegment } from './models/segment';
import { initSequelize } from './sequelize';

export async function initStore(config: StoreConfig) {
  Config.init(config);

  const sequelize = initSequelize();

  initKnowledgeDocument(sequelize);
  initDatasetEmbeddingHistory(sequelize);
  initKnowledgeSegment(sequelize);

  await migrate(sequelize);
}
