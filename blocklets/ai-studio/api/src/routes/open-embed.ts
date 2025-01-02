import { importPackageJson } from '@api/libs/package-json';
import Project from '@api/store/models/project';
import { PROJECT_FILE_PATH, ProjectRepo, defaultBranch, getAssistantsOfRepository } from '@api/store/repository';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import type { ProjectSettings } from '@blocklet/ai-runtime/types';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { getAgentProfile } from '@blocklet/aigne-sdk/utils/agent';
import { config } from '@blocklet/sdk';
import type { Request, Response } from 'express';
import { withQuery } from 'ufo';

const { version } = importPackageJson();

export async function getOpenEmbed(_: Request, res: Response) {
  const projects = config.env.tenantMode === 'multiple' ? [] : await Project.findAll({});

  const agents = (
    await Promise.all(
      projects.map(async (p) => {
        const projectRef = p.gitDefaultBranch || defaultBranch;

        const repository = await ProjectRepo.load({ projectId: p.id });

        const project = await repository.readAndParseFile<ProjectSettings>({
          filepath: PROJECT_FILE_PATH,
          rejectOnEmpty: false,
          working: true,
          readBlobFromGitIfWorkingNotInitialized: true,
        });

        if (!project) return [];

        const agents = await getAssistantsOfRepository({
          projectId: p.id,
          ref: projectRef,
          working: true,
        });

        return agents
          .filter((i) => i.openEmbed?.enable)
          .map((i) => ({
            ...i,
            project,
          }));
      })
    )
  ).flat();

  // NOTICE: 这个是必须设置的
  res.header('x-blocklet-openembed', '0.1.0');

  res.json({
    openembed: '0.1.0',
    info: {
      title: 'AIGNE Studio',
      description: 'Embeds from AIGNE Studio',
      version,
    },
    embeds: Object.fromEntries(
      agents.map((agent) => {
        const parameters = agent.parameters
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
          .filter(isNonNullable);
        // API 类型仅支持只有 question 输入和 text 输出的 agent
        const isApiCall =
          !parameters?.some((x) => x.name !== 'question') &&
          agent.outputVariables?.length === 1 &&
          agent.outputVariables.every((i) => i.name === RuntimeOutputVariable.text);

        const scriptPath = isApiCall ? '/open-embed/agent-call/index.mjs' : '/open-embed/agent-view/index.mjs';

        const aid = stringifyIdentity({
          projectId: agent.project.id,
          agentId: agent.id,
        });

        return [
          withQuery(scriptPath, {
            aid,
          }),
          {
            type: isApiCall ? 'function' : 'react',
            name: agent.name || 'Unnamed',
            description: agent.description,
            parameters,
            icon: getAgentProfile({
              ...agent,
              identity: { ...parseIdentity(aid, { rejectWhenError: true }), aid },
              project: agent.project,
            }).icon,
          },
        ];
      })
    ),
  });
}
