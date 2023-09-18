import { Template } from '../../api/src/store/templates';

export function isTemplateEmpty(template: Template) {
  if (template.branch?.branches.some((i) => !!i.template)) {
    return false;
  }
  if (template.prompts?.some((i) => i.content?.trim())) {
    return false;
  }
  return true;
}
