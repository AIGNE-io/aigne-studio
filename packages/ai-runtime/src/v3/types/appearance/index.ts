import { TypeRef } from '../type-define';
import { OrderedMap } from '../utils';

export interface Appearance {
  pages?: OrderedMap<Page>;

  components?: OrderedMap<Component>;
}

export interface Page {
  id: string;

  name?: string;

  description?: string;

  path?: string;

  sections?: OrderedMap<Section>;
}

export interface Section {
  id: string;
  name?: string;
  description?: string;

  renderer?: {
    type: 'component';
    componentId: string;
    properties?: { [id: string]: undefined | { value: any } | { type: 'variable'; variableId: string } };
  };
}

export interface Component {
  id: string;
  name?: string;
  description?: string;
  properties?: OrderedMap<ComponentProperty>;

  renderer?:
    | {
        type: 'sections';
        sections?: OrderedMap<Section>;
      }
    | {
        type: 'react-component';
        script?: string;
      };
}

export type ComponentProperty = TypeRef & {
  id: string;
  name?: string;
  description?: string;
  required?: boolean;
};
