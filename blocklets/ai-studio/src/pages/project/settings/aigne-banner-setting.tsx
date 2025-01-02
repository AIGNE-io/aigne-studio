import { useCurrentProject } from '@app/contexts/project';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { Stack, Switch } from '@mui/material';

import ImageAigneBannerHidden from '../../../assets/images/aigne-banner-hidden.png';
import ImageAigneBannerVisible from '../../../assets/images/aigne-banner-visible.png';
import { useMultiTenantRestriction } from '../../../components/multi-tenant-restriction';
import { useProjectStore } from '../yjs-state';

export default function AigneBannerSetting() {
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const { appearance } = projectSetting || {};
  const { quotaChecker } = useMultiTenantRestriction();
  const visible = appearance?.aigneBannerVisible ?? true;

  return (
    <Stack>
      <Switch
        checked={visible}
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

      <Stack sx={{ mt: 2, border: 1, borderColor: 'divider' }}>
        {visible ? (
          <img src={ImageAigneBannerVisible} alt="Aigne Banner Visible" style={{ width: '100%' }} />
        ) : (
          <img src={ImageAigneBannerHidden} alt="Aigne Banner Hidden" style={{ width: '100%' }} />
        )}
      </Stack>
    </Stack>
  );
}
