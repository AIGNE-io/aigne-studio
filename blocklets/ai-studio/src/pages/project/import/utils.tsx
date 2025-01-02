import type { Template } from '../../../../api/src/store/0.1.157/templates';

export type TreeNode = {
  id: string;
  parent: string;
  text: string;
  data?: Template;
  type: string;
};

const getDepTemplates = (list: TreeNode[], templateId: string, save = false): TreeNode[] => {
  let templates: TreeNode[] = [];

  try {
    const template = list.find((x: TreeNode) => (x.text || '').split('.')[0] === (templateId || '').split('.')[0]);

    if (template) {
      if (save) {
        templates = [...templates, template];
      }

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
