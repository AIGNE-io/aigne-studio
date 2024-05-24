import Joi from 'joi';

const MountPointSchema = Joi.object({});

const schema = Joi.object({
  name: Joi.string().required().allow('').empty([null, '']),
  path: Joi.string().required().allow('').empty([null, '']),
  did: Joi.string().required().allow('').empty([null, '']),
  component: MountPointSchema.required(),
}).unknown(true);

export default schema;
