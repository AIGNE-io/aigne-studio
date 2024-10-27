import { Faker, en } from '@faker-js/faker';
import { JSONSchemaFaker } from 'json-schema-faker';

JSONSchemaFaker.option({ requiredOnly: true });

JSONSchemaFaker.extend('faker', () => {
  const faker = new Faker({ locale: [en] });

  const originalFakerImage = faker.image.url;

  faker.image.url = (options) =>
    originalFakerImage({ ...options, width: options?.width || 1000, height: options?.height || 1000 });

  return faker;
});

export const generateFakeProps = (schema: any) => JSONSchemaFaker.generate(schema);
