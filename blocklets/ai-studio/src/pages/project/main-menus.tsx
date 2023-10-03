import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Menus, MenusProps } from '@blocklet/studio-ui';
import { DesignServicesRounded, HomeRounded } from '@mui/icons-material';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export default function MainMenus({ ...props }: Omit<MenusProps, 'menus'>) {
  const { t } = useLocaleContext();

  const { projectId } = useParams();

  const menus = useMemo(() => {
    const menus: MenusProps['menus'] = [];

    menus.push({ icon: <HomeRounded />, title: t('home'), url: projectId ? 'home' : '.' });

    if (projectId) {
      menus.push({ icon: <DesignServicesRounded />, title: t('prompts'), url: 'prompts' });
    }

    return menus;
  }, [projectId]);

  return <Menus {...props} menus={menus} />;
}
