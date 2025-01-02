import { authClient } from '@api/libs/auth';
import Project from '@api/store/models/project';

import { EVENTS, event } from '../event';

const projectHandlers = {
  [EVENTS.PROJECT.CREATED]: async ({ projectId }: { projectId: string }) => {
    console.error('project created', projectId);
  },
  [EVENTS.PROJECT.UPDATED]: async ({ projectId }: { projectId: string }) => {
    console.error('project updated', projectId);

    const project = await Project.findOne({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return;
    }

    const { user } = await authClient.getUser(project.createdBy);
    const endpoint = user?.didSpace?.endpoint;
    console.error(endpoint);

    // if (isEmpty(endpoint)) {
    //   return;
    // }

    // const spaceClient = new SpaceClient({
    //   endpoint,
    //   wallet,
    // });
    // console.error(spaceClient);

    // await spaceClient.send(
    //   new PutPreviewObjectCommand({
    //     key: `projects/${project.id}/preview.png`,
    //     data: {
    //       template: 'project',
    //       did: project.id,
    //       name: project.name!,
    //       description: project.description!,
    //       image: 'https://bbqa62m2l7vxzoygklrl3aetcm5x6uv54c52vkw42vy.did.abtnet.io/projects',
    //       url: 'https://bbqa62m2l7vxzoygklrl3aetcm5x6uv54c52vkw42vy.did.abtnet.io/projects',
    //       createdAt: project.createdAt.toISOString(),
    //     },
    //   })
    // );
  },
};

// 订阅事件
Object.entries(projectHandlers).forEach(([key, handler]) => event.on(key, handler));
