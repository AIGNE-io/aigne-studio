import { NodeModel } from '@minoru/react-dnd-treeview';

import { EntryWithMeta } from '../../../../api/src/routes/tree';

export type TreeNode = NodeModel<EntryWithMeta> & { type: string };

const getDepTemplates = (list: TreeNode[], templateId: string, save = false) => {
  let templates: any[] = [];

  try {
    const template = list.find((x: any) => (x.text || '').split('.')[0] === (templateId || '').split('.')[0]);

    if (template) {
      if (save) {
        templates = [...templates, template];
      }

      // @ts-ignore
      const nextId = template.data?.next?.id;
      if (nextId) {
        const nextTemplate = getDepTemplates(list, nextId, true);

        if (nextTemplate?.length) {
          templates = [...templates, ...nextTemplate];
        }
      }
    }
  } catch (error) {
    // return templates
  }

  return templates;
};

export default getDepTemplates;
