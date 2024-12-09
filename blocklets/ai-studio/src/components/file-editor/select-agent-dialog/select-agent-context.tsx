import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { createContext, useContext, useMemo, useState } from 'react';

import { ObjectPropType } from './components/schema';

export interface SelectAgent {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode | string;
  createdByInfo: {
    name: string;
    avatar: React.ReactNode | string;
    updatedAt?: string;
  };
  tags?: string[];
  input?: ObjectPropType;
  output?: ObjectPropType;
}

export interface SelectAgentContextProps {
  tab: 'all' | 'currentProject' | string;
  setTab: (tab: SelectAgentContextProps['tab']) => void;
  keyword: string;
  setKeyword: (keyword: string) => void;
  selectedAgent?: SelectAgent;
  setSelectedAgent: (agent?: SelectAgent) => void;
  currentAgent: AssistantYjs;
}

export const SelectAgentContext = createContext<SelectAgentContextProps>({} as any);

export const useSelectAgentContext = () => useContext(SelectAgentContext);

interface SelectAgentProviderProps {
  children: React.ReactNode;
  currentAgent: AssistantYjs;
}

export const SelectAgentProvider = ({ children, currentAgent }: SelectAgentProviderProps) => {
  const [tab, setTab] = useState<SelectAgentContextProps['tab']>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<SelectAgent>();

  const context = useMemo(
    () => ({ tab, setTab, keyword, setKeyword, selectedAgent, setSelectedAgent, currentAgent }),
    [tab, keyword, selectedAgent, currentAgent]
  );

  return <SelectAgentContext.Provider value={context}>{children}</SelectAgentContext.Provider>;
};
