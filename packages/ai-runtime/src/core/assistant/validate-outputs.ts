import { isNil } from 'lodash';

import { Assistant, Variable, outputVariablesToJoiSchema } from '../../types';

export function validateOutputs({
  assistant,
  datastoreVariables,
  inputs,
  outputs,
}: {
  assistant: Assistant;
  datastoreVariables: Variable[];
  inputs: any;
  outputs: any;
}) {
  const joiSchema = outputVariablesToJoiSchema(assistant, datastoreVariables);
  const outputInputs = assistant.outputVariables?.reduce((res, output) => {
    const input =
      output.from?.type === 'input' ? assistant.parameters?.find((input) => input.id === output.from?.id) : undefined;

    if (input?.key) {
      const val = inputs?.[input.key];
      if (!isNil(val)) return { ...res, [input.key]: val };
    }

    return res;
  }, {});
  return joiSchema.validateAsync({ ...outputs, ...outputInputs }, { stripUnknown: true });
}
