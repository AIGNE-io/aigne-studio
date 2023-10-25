import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { useRequest } from 'ahooks';
import equal from 'fast-deep-equal';
import cloneDeep from 'lodash/cloneDeep';
import differenceBy from 'lodash/differenceBy';
import intersectionBy from 'lodash/intersectionBy';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import { useEffect, useMemo } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { getTemplates } from '../../libs/template';
import { templateYjsFromTemplate, useStore } from './yjs-state';

const useTemplateChanges = (projectId: string, ref: string) => {
  const { t } = useLocaleContext();
  const { data, loading, run } = useRequest(() => getTemplates(projectId, ref), { manual: true });

  const templates = (data?.templates || []).map((i) =>
    omit(omitBy(templateYjsFromTemplate(i), isUndefined), 'ref', 'projectId')
  ) as (TemplateYjs & { parent: string[] })[];

  const { store } = useStore(projectId, ref, true);

  const files = (Object.values(cloneDeep(store.files)) as TemplateYjs[]).filter((x) => x.id);

  const arrToObj = (list: TemplateYjs[]): { [key: string]: TemplateYjs } => {
    return list.reduce((pre, cur) => {
      return { ...pre, [cur.id]: cur };
    }, {});
  };

  const news = useMemo(() => {
    if (loading) {
      return [];
    }

    return differenceBy(files, templates, 'id');
  }, [files, templates, loading]);

  const deleted = useMemo(() => {
    if (loading) {
      return [];
    }

    return differenceBy(templates, files, 'id');
  }, [files, templates, loading]);

  const modify = useMemo(() => {
    if (loading) {
      return [];
    }

    const duplicateItems = intersectionBy(templates, files, 'id');

    const keys = [
      'id',
      'createdBy',
      'updatedBy',
      'name',
      'description',
      'tags',
      'prompts',
      'parameters',
      'mode',
      'status',
      'public',
      'datasets',
      'next',
      'tests',
    ];

    return duplicateItems.filter((i) => {
      const item = omitBy(pick(i, ...keys), isUndefined);
      const found = files.find((f) => item.id === f.id);
      if (!found) {
        return false;
      }
      const file = omitBy(pick(found, ...keys), isUndefined);

      return !equal(item, file);
    });
  }, [files, templates, loading]);

  const newsMap = arrToObj(news);
  const modifyMap = arrToObj(modify);
  const deletedMap = arrToObj(deleted);

  const changes = (item: TemplateYjs) => {
    if (newsMap[item.id]) {
      return {
        key: 'N',
        color: 'green',
        tips: t('templates.add'),
      };
    }

    if (modifyMap[item.id]) {
      return {
        key: 'M',
        color: 'orange',
        tips: t('templates.modify'),
      };
    }

    if (deletedMap[item.id]) {
      return {
        key: 'D',
        color: 'red',
        tips: t('templates.delete'),
      };
    }

    return null;
  };

  useEffect(() => {
    if (projectId && ref) {
      run();
    }
  }, [projectId, ref]);

  const disabled = useMemo(() => {
    return news.length + deleted.length + modify.length === 0;
  }, [news, deleted, modify]);

  return { news, deleted, modify, newsMap, deletedMap, modifyMap, changes, disabled, run };
};

export default useTemplateChanges;
