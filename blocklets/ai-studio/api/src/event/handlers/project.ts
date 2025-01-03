import Project from '@api/store/models/project';

import { EVENTS, event } from '../event';

const projectHandlers = {
  [EVENTS.PROJECT.CREATED]: async ({ projectId }: { projectId: string }) => {
    await Project.updatePreviewObject(projectId);
  },
  [EVENTS.PROJECT.UPDATED]: async ({ projectId }: { projectId: string }) => {
    await Project.updatePreviewObject(projectId);
  },
  [EVENTS.PROJECT.DELETED]: async ({ project }: { project: Project }) => {
    await Project.deletePreviewObject(project);
  },
};

// 订阅事件
Object.entries(projectHandlers).forEach(([key, handler]) => event.on(key, handler));
