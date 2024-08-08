import Project from '@api/store/models/project';
import { defaultBranch, getAssistantsOfRepository } from '@api/store/repository';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Request, Response } from 'express';
import { withQuery } from 'ufo';

export async function getOpenEmbed(_: Request, res: Response) {
  const projects = await Project.findAll({});

  const agents = (
    await Promise.all(
      projects.map(async (project) => {
        const projectRef = project.gitDefaultBranch || defaultBranch;

        const agents = await getAssistantsOfRepository({
          projectId: project.id,
          ref: projectRef,
          working: true,
        });

        return agents.map((i) => ({ ...i, project }));
      })
    )
  ).flat();

  res.json({
    openembed: '0.1.0',
    info: {
      title: 'AIGNE Studio',
      description: 'Agents from AIGNE Studio',
      version: '0.1.0',
    },
    embeds: Object.fromEntries(
      agents.map((agent) => {
        return [
          withQuery('/assets/open-embed/agent-view.mjs', {
            aid: stringifyIdentity({ projectId: agent.project.id, agentId: agent.id }),
          }),
          {
            type: 'react',
            name: agent.name || 'Unnamed',
            description: agent.description,
            parameters: agent.parameters
              ?.map((i) => {
                const type = !i.type
                  ? 'string'
                  : (<{ [key: string]: string }>{
                      string: 'string',
                      number: 'number',
                      select: 'string',
                      language: 'string',
                    })[i.type];
                if (!type) return null;

                return {
                  name: i.key || i.id,
                  description: i.placeholder || i.helper,
                  required: i.required,
                  schema: {
                    type,
                  },
                };
              })
              .filter(isNonNullable),
          },
        ];
      })
    ),
  });
}
