import { useSearchParams } from 'react-router-dom';

export function useTabFromQuery<T extends string>(tabs: [T, ...T[]]) {
  const [search, setSearch] = useSearchParams();
  const t = search.get('tab');
  const tab = tabs.find((i) => i === t) || tabs[0];

  const setTab = (tab: T) => {
    setSearch((v) => {
      if (tab === tabs[0]) {
        v.delete('tab');
      } else {
        v.set('tab', tab);
      }
      return v;
    });
  };

  return [tab, setTab] as const;
}
