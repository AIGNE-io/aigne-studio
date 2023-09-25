import { TemplateYjs } from '../../api/src/store/projects';
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

export function isTemplateYjsEmpty(template: TemplateYjs) {
  if (Object.keys(template.branch?.branches ?? {}).length) {
    return false;
  }
  if (Object.keys(template.prompts ?? {}).length) {
    return false;
  }
  return true;
}
