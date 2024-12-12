import { getSpaceInfo } from '@app/libs/did-spaces';
import { useRequest } from 'ahooks';

export default function useSpaceInfo(endpoint: string) {
  return useRequest(
    async () => {
      if (!endpoint) {
        return undefined;
      }
      return getSpaceInfo(endpoint);
    },
    {
      refreshDeps: [endpoint],
      cacheKey: endpoint,
    }
  );
}
