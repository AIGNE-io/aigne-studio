import { OutputVariable, RuntimeOutputVariable } from '../types';

export const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';
export const AI_RUNTIME_DID = 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2';
export const PAYMENT_KIT_DID = 'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk';

export const DEFAULT_PAGE_COMPONENT_ID = 'ctnxha29uu8cx4xv'; // Simple Layout
export const DEFAULT_INPUT_COMPONENT_ID = '1wwtemqcdio6nqf0'; // Auto Form
export const DEFAULT_OUTPUT_COMPONENT_ID = 'q0ckknkxph4hfwas'; // Simple Output
export const DEFAULT_HEADER_COMPONENT_ID = 'fcsalwxul6lqc0py'; // Simple Header
export const DEFAULT_MARKDOWN_COMPONENT_ID = 'a4oldpoxv7bikvpj';
export const DEFAULT_SUGGESTED_QUESTIONS_COMPONENT_ID = '6u8m11ss7fvu8t7i';
export const DEFAULT_REFERENCED_LINKS_COMPONENT_ID = 'baqmaoccdntqwayc';
export const DEFAULT_SHARE_COMPONENT_ID = 'jfq3df9z8lkk9not';
export const DEFAULT_IMAGES_COMPONENT_ID = 'txirtdgx8h2bmo7s';
export const DEFAULT_OPENING_QUESTIONS_COMPONENT_ID = 'vgsgsvnhud0cq37v';

export const DEFAULT_OUTPUT_COMPONENTS: { [name: string]: { componentId: string; componentName: string } } = {
  [RuntimeOutputVariable.appearancePage]: {
    componentId: DEFAULT_PAGE_COMPONENT_ID,
    componentName: 'Simple Page',
  },
  [RuntimeOutputVariable.appearanceInput]: {
    componentId: DEFAULT_INPUT_COMPONENT_ID,
    componentName: 'Auto Form',
  },
  [RuntimeOutputVariable.appearanceOutput]: {
    componentId: DEFAULT_OUTPUT_COMPONENT_ID,
    componentName: 'Simple Output',
  },
  [RuntimeOutputVariable.profile]: {
    componentId: DEFAULT_HEADER_COMPONENT_ID,
    componentName: 'Simple Header',
  },
  [RuntimeOutputVariable.text]: {
    componentId: DEFAULT_MARKDOWN_COMPONENT_ID,
    componentName: 'Markdown View',
  },
  [RuntimeOutputVariable.images]: {
    componentId: DEFAULT_IMAGES_COMPONENT_ID,
    componentName: 'Images View',
  },
  [RuntimeOutputVariable.openingMessage]: {
    componentId: DEFAULT_MARKDOWN_COMPONENT_ID,
    componentName: 'Opening Message View',
  },
  [RuntimeOutputVariable.suggestedQuestions]: {
    componentId: DEFAULT_SUGGESTED_QUESTIONS_COMPONENT_ID,
    componentName: 'Suggested Questions View',
  },
  [RuntimeOutputVariable.referenceLinks]: {
    componentId: DEFAULT_REFERENCED_LINKS_COMPONENT_ID,
    componentName: 'Referenced Links View',
  },
  [RuntimeOutputVariable.share]: {
    componentId: DEFAULT_SHARE_COMPONENT_ID,
    componentName: 'Share View',
  },
  [RuntimeOutputVariable.openingQuestions]: {
    componentId: DEFAULT_OPENING_QUESTIONS_COMPONENT_ID,
    componentName: 'Opening Questions View',
  },
};

export function getDefaultOutputComponent(output: Pick<OutputVariable, 'name'>) {
  return DEFAULT_OUTPUT_COMPONENTS[output.name!];
}
