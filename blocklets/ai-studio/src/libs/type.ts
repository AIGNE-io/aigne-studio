interface JSONSchemaBase {
  name?: string;
  description?: string;
  required?: boolean;
}

type JSONSchema = JSONSchemaBase &
  (
    | {
        type: 'string';
      }
    | {
        type: 'number';
      }
    | {
        type: 'boolean';
      }
    | {
        type: 'object';
        properties?: { [key: string]: JSONSchema };
      }
    | {
        type: 'array';
        items?: JSONSchema;
      }
  );

export type RemoteComponent = {
  name: string;
  description?: string;
  tags?: string[];
  parameter?: { [key: string]: JSONSchema };
  url: string;
  did: string;
};
