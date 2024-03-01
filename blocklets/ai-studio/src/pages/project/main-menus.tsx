import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Menus, MenusProps } from '@blocklet/studio-ui';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import Database from './icons/database';
import DocumentStack from './icons/document-stack';
import Home from './icons/home';
import Settings from './icons/settings';

export default function MainMenus({ ...props }: Omit<MenusProps, 'menus'>) {
  const { t } = useLocaleContext();

  const { projectId } = useParams();

  const menus = useMemo(() => {
    const menus: MenusProps['menus'] = [];

    menus.push({ icon: <Home />, title: t('home'), url: projectId ? 'home' : '.' });

    if (projectId) {
      menus.push({ icon: <DocumentStack />, title: t('prompts'), url: 'file' });
    }

    if (projectId) {
      menus.push({ icon: <Settings />, title: t('setting'), url: 'settings' });
    }

    if (projectId) {
      menus.push({ icon: <Database />, title: t('knowledge'), url: 'knowledge' });
    }

    return menus;
  }, [projectId, t]);

  return <Menus {...props} menus={menus} />;
}
