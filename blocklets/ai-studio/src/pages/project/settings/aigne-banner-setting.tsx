import { useCurrentProject } from '@app/contexts/project';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Switch } from '@mui/material';

import { useMultiTenantRestriction } from '../../../components/multi-tenant-restriction';
import { useProjectStore } from '../yjs-state';

export default function AigneBannerSetting() {
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const { appearance } = projectSetting || {};
  const { quotaChecker } = useMultiTenantRestriction();

  return (
    <Switch
      checked={appearance?.aigneBannerVisible ?? true}
      onChange={(e) => {
        if (quotaChecker.checkCustomBrand()) {
          const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
          doc.transact(() => {
            projectSetting.appearance ??= {};
            projectSetting.appearance.aigneBannerVisible = e.target.checked;
          });
        }
      }}
    />
  );
}
