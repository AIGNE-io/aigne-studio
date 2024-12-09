import Avatar from '@app/components/avatar';
import Loading from '@app/components/loading';
import { getAPIList } from '@app/libs/knowledge';
import { getProjectIconUrl } from '@app/libs/project';
import { useCurrentProjectState } from '@app/pages/project/state';
import { usePromptAgents } from '@app/pages/project/yjs-state';
import { useAgents } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import getOpenApiTextFromI18n from '@blocklet/dataset-sdk/util/get-open-api-i18n-text';
import { Box } from '@mui/material';
import { useRequest } from 'ahooks';
import { joinURL } from 'ufo';

import { FROM_API } from '../../router-file/dialog';
import { SelectAgent, useSelectAgentContext } from '../select-agent-context';
import { parametersToSchema, responsesToSchema } from '../utils/openapi';
import SelectAgentCard from './card';

interface ListProps {
  title?: string;
  options: (SelectAgent & { [key: string]: any })[];
}

const List = ({ title, options }: ListProps) => {
  const { keyword, tab } = useSelectAgentContext();
  const match = (i: SelectAgent) => {
    if (keyword && !i.name.toLowerCase().includes(keyword.toLowerCase())) return false;
    if (tab !== 'all' && tab !== 'currentProject') return i.tags?.some((tag) => tag === tab);
    return true;
  };
  const filteredOpts = options.filter(match);

  if (filteredOpts.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      {title && <Box sx={{ fontSize: 14, color: '#4B5563' }}>{title}</Box>}
      <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {filteredOpts.map((agent) => (
          <SelectAgentCard key={agent.id} agent={agent} />
        ))}
      </Box>
    </Box>
  );
};

const SelectAgentList = () => {
  const { t, locale } = useLocaleContext();
  const { tab, currentAgent } = useSelectAgentContext();
  const {
    state: { project },
  } = useCurrentProjectState();
  const { resourceAgents, loading } = useAgents({ type: 'tool' });
  const { data: openApis = [] } = useRequest(() => getAPIList());
  const promptAgents = usePromptAgents();

  if (!project) return null;

  const localAgentOpts = promptAgents
    .filter(({ id }) => id !== currentAgent.id)
    .map((agent) => ({
      id: agent.id,
      name: agent.name ?? '',
      tags: agent.tags ?? [],
      description: agent.description ?? '',
      logo: getProjectIconUrl(project.id, { updatedAt: project.updatedAt, working: true }),
      createdByInfo: {
        name: project.createdByInfo?.fullName ?? '',
        avatar: project.createdByInfo?.avatar,
        updatedAt: project.updatedAt,
      },

      // for decision
      type: agent.type,
      from: undefined,
    }));

  const resourceAgentOpts = resourceAgents.map((agent) => {
    const { project, identity } = agent;

    return {
      id: agent.id,
      name: agent.name ?? '',
      tags: agent.tags ?? [],
      description: agent.description ?? project.description ?? '',
      logo: getProjectIconUrl(project.id, { blockletDid: identity.blockletDid, updatedAt: project.updatedAt }),
      createdByInfo: {
        name: project.name ?? '',
        avatar: <Avatar did={agent.createdBy} size={16} shape="circle" />,
        updatedAt: project.updatedAt,
      },
      from: undefined,
    };
  });

  const blockletsMap = Object.fromEntries(window.blocklet.componentMountPoints.map((i) => [i.did, i]));

  const openApiOpts = openApis.map((api) => {
    const name =
      getOpenApiTextFromI18n(api, 'summary', locale) ||
      getOpenApiTextFromI18n(api, 'description', locale) ||
      t('unnamed');

    const blockletDid = api.did!;
    const blocklet = blockletsMap[blockletDid];
    const logo = joinURL('/.well-known/service/blocklet/logo-bundle', blockletDid, `?v=${blocklet?.version}`);
    return {
      id: api.id,
      name,
      description: getOpenApiTextFromI18n(api, 'description', locale),
      logo,
      createdByInfo: {
        name: blocklet?.title ?? '',
        avatar: logo,
      },
      input: parametersToSchema(api.parameters ?? []),
      output: responsesToSchema(api.responses ?? {}),
      from: FROM_API,
    };
  });

  const restOpts = [...resourceAgentOpts, ...openApiOpts] as SelectAgent[];
  const allOpts = [...localAgentOpts, ...restOpts] as SelectAgent[];

  if (loading) {
    return <Loading />;
  }

  if (tab === 'all') {
    return (
      <Box>
        <List title={t('currentProject')} options={localAgentOpts} />
        <List title={t('tools')} options={restOpts} />
      </Box>
    );
  }

  if (tab === 'currentProject') {
    return <List options={localAgentOpts} />;
  }

  return <List options={allOpts} />;
};

export default SelectAgentList;
