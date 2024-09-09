import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  // Sessions
  await queryInterface.addIndex('Sessions', ['userId']);
  await queryInterface.addIndex('Sessions', ['projectId']);
  await queryInterface.addIndex('Sessions', ['agentId']);

  // Histories
  await queryInterface.addIndex('Histories', ['userId']);
  await queryInterface.addIndex('Histories', ['projectId']);
  await queryInterface.addIndex('Histories', ['projectRef']);
  await queryInterface.addIndex('Histories', ['projectId', 'projectRef']);
  await queryInterface.addIndex('Histories', ['blockletDid', 'projectId']);
  await queryInterface.addIndex('Histories', ['agentId']);
  await queryInterface.addIndex('Histories', ['sessionId']);

  // Memories
  await queryInterface.addIndex('Memories', ['userId']);
  await queryInterface.addIndex('Memories', ['sessionId']);
  await queryInterface.addIndex('Memories', ['projectId']);
  await queryInterface.addIndex('Memories', ['agentId']);
  await queryInterface.addIndex('Memories', ['scope']);
  await queryInterface.addIndex('Memories', ['key']);
  await queryInterface.addIndex('Memories', ['itemId']);

  // ExecutionCaches
  await queryInterface.addIndex('ExecutionCaches', ['projectId']);
  await queryInterface.addIndex('ExecutionCaches', ['projectRef']);
  await queryInterface.addIndex('ExecutionCaches', ['projectId', 'projectRef']);
  await queryInterface.addIndex('ExecutionCaches', ['blockletDid', 'projectId']);
  await queryInterface.addIndex('ExecutionCaches', ['agentId']);
  await queryInterface.addIndex('ExecutionCaches', ['cacheKey']);

  // Secrets
  await queryInterface.addIndex('Secrets', ['projectId']);
  await queryInterface.addIndex('Secrets', ['targetProjectId']);
  await queryInterface.addIndex('Secrets', ['targetProjectId', 'targetAgentId', 'targetInputKey']);

  // CronHistories
  await queryInterface.addIndex('CronHistories', ['projectId']);
  await queryInterface.addIndex('CronHistories', ['projectId', 'projectRef']);
  await queryInterface.addIndex('CronHistories', ['blockletDid', 'projectId']);
  await queryInterface.addIndex('CronHistories', ['agentId']);
  await queryInterface.addIndex('CronHistories', ['cronJobId']);

  // Datasets
  await queryInterface.addIndex('Datasets', ['createdBy']);
  await queryInterface.addIndex('Datasets', ['appId']);

  // DatasetDocuments
  await queryInterface.addIndex('DatasetDocuments', ['datasetId']);
  await queryInterface.addIndex('DatasetDocuments', ['createdBy']);
  await queryInterface.addIndex('DatasetDocuments', ['embeddingStatus']);

  // DatasetContents
  await queryInterface.addIndex('DatasetContents', ['documentId']);

  // DatasetSegments
  await queryInterface.addIndex('DatasetSegments', ['documentId']);
  await queryInterface.addIndex('DatasetSegments', ['targetId']);

  // DatasetUpdateHistories
  await queryInterface.addIndex('DatasetUpdateHistories', ['datasetId']);
  await queryInterface.addIndex('DatasetUpdateHistories', ['documentId']);

  // DatasetEmbeddingHistories
  await queryInterface.addIndex('DatasetEmbeddingHistories', ['targetId']);
  await queryInterface.addIndex('DatasetEmbeddingHistories', ['datasetId']);
  await queryInterface.addIndex('DatasetEmbeddingHistories', ['documentId']);
  await queryInterface.addIndex('DatasetEmbeddingHistories', ['status']);
};

export const down: Migration = async ({ context: queryInterface }) => {
  // Sessions
  await queryInterface.removeIndex('Sessions', ['userId']);
  await queryInterface.removeIndex('Sessions', ['projectId']);
  await queryInterface.removeIndex('Sessions', ['agentId']);

  // Histories
  await queryInterface.removeIndex('Histories', ['userId']);
  await queryInterface.removeIndex('Histories', ['projectId']);
  await queryInterface.removeIndex('Histories', ['projectRef']);
  await queryInterface.removeIndex('Histories', ['projectId', 'projectRef']);
  await queryInterface.removeIndex('Histories', ['blockletDid', 'projectId']);
  await queryInterface.removeIndex('Histories', ['agentId']);
  await queryInterface.removeIndex('Histories', ['sessionId']);

  // Memories
  await queryInterface.removeIndex('Memories', ['userId']);
  await queryInterface.removeIndex('Memories', ['sessionId']);
  await queryInterface.removeIndex('Memories', ['projectId']);
  await queryInterface.removeIndex('Memories', ['agentId']);
  await queryInterface.removeIndex('Memories', ['scope']);
  await queryInterface.removeIndex('Memories', ['key']);
  await queryInterface.removeIndex('Memories', ['itemId']);

  // ExecutionCaches
  await queryInterface.removeIndex('ExecutionCaches', ['projectId']);
  await queryInterface.removeIndex('ExecutionCaches', ['projectRef']);
  await queryInterface.removeIndex('ExecutionCaches', ['projectId', 'projectRef']);
  await queryInterface.removeIndex('ExecutionCaches', ['blockletDid', 'projectId']);
  await queryInterface.removeIndex('ExecutionCaches', ['agentId']);
  await queryInterface.removeIndex('ExecutionCaches', ['cacheKey']);

  // Secrets
  await queryInterface.removeIndex('Secrets', ['projectId']);
  await queryInterface.removeIndex('Secrets', ['targetProjectId']);
  await queryInterface.removeIndex('Secrets', ['targetProjectId', 'targetAgentId', 'targetInputKey']);

  // CronHistories
  await queryInterface.removeIndex('CronHistories', ['projectId']);
  await queryInterface.removeIndex('CronHistories', ['projectId', 'projectRef']);
  await queryInterface.removeIndex('CronHistories', ['blockletDid', 'projectId']);
  await queryInterface.removeIndex('CronHistories', ['agentId']);
  await queryInterface.removeIndex('CronHistories', ['cronJobId']);

  // Datasets
  await queryInterface.removeIndex('Datasets', ['createdBy']);
  await queryInterface.removeIndex('Datasets', ['appId']);

  // DatasetDocuments
  await queryInterface.removeIndex('DatasetDocuments', ['datasetId']);
  await queryInterface.removeIndex('DatasetDocuments', ['createdBy']);
  await queryInterface.removeIndex('DatasetDocuments', ['embeddingStatus']);

  // DatasetContents
  await queryInterface.removeIndex('DatasetContents', ['documentId']);

  // DatasetSegments
  await queryInterface.removeIndex('DatasetSegments', ['documentId']);
  await queryInterface.removeIndex('DatasetSegments', ['targetId']);

  // DatasetUpdateHistories
  await queryInterface.removeIndex('DatasetUpdateHistories', ['datasetId']);
  await queryInterface.removeIndex('DatasetUpdateHistories', ['documentId']);

  // DatasetEmbeddingHistories
  await queryInterface.removeIndex('DatasetEmbeddingHistories', ['targetId']);
  await queryInterface.removeIndex('DatasetEmbeddingHistories', ['datasetId']);
  await queryInterface.removeIndex('DatasetEmbeddingHistories', ['documentId']);
  await queryInterface.removeIndex('DatasetEmbeddingHistories', ['status']);
};
