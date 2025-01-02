import { EVENTS, event } from '../event';

const projectHandlers = {
  [EVENTS.PROJECT.CREATED]: async ({ projectId }: { projectId: string }) => {
    console.error('project created', projectId);
  },
  [EVENTS.PROJECT.UPDATED]: async ({ projectId }: { projectId: string }) => {
    console.error('project updated', projectId);
  },
};

// 订阅事件
// @ts-expect-error
Object.keys(projectHandlers).forEach((key) => event.on(key, projectHandlers[key]));
