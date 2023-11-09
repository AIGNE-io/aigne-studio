// @ts-nocheck

import Mustache from 'mustache';

const defaultWriter = new Mustache.Writer();

defaultWriter.render = async function render(template, view, partials, config) {
  const tags = this.getConfigTags(config);
  const tokens = this.parse(template, tags);
  const context = view instanceof Mustache.Context ? view : new Mustache.Context(view, undefined);
  return this.renderTokens(tokens, context, partials, template, config);
} as any;

defaultWriter.renderTokens = async function renderTokens(tokens, context, partials, originalTemplate, config) {
  let buffer = '';

  let token;
  let symbol;
  let value;
  for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    value = undefined;
    token = tokens[i];
    // eslint-disable-next-line prefer-destructuring
    symbol = token[0];

    if (symbol === '#') value = await this.renderSection(token, context, partials, originalTemplate, config);
    else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate, config);
    else if (symbol === '>') value = this.renderPartial(token, context, partials, config);
    else if (symbol === '&') value = this.unescapedValue(token, context);
    else if (symbol === 'name') value = await this.renderVariable(token, context, partials, originalTemplate, config);
    else if (symbol === 'text') value = this.rawValue(token);

    if (value !== undefined) buffer += value;
  }

  return buffer;
} as any;

defaultWriter.renderVariable = async function renderVariable(token, context, partials, originalTemplate, config) {
  const value = context.lookup(token[1]);
  if (typeof value === 'function') {
    return value.call(context.view);
  }
  return this.escapedValue(token, context, config);
};

defaultWriter.renderSection = async function renderSection(token, context, partials, originalTemplate, config) {
  const self = this;
  let buffer = '';
  let value = context.lookup(token[1]);

  // This function is used to render an arbitrary template
  // in the current context by higher-order sections.
  function subRender(template) {
    return self.render(template, context, partials, config);
  }

  if (!value) return undefined;

  if (Array.isArray(value)) {
    for (let j = 0, valueLength = value.length; j < valueLength; ++j) {
      buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate, config);
    }
  } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
    buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate, config);
  } else if (typeof value === 'function') {
    if (typeof originalTemplate !== 'string')
      throw new Error('Cannot use higher-order sections without the original template');

    // Extract the portion of the original template that the section contains.
    value = await value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

    if (value != null) buffer += value;
  } else {
    buffer += this.renderTokens(token[4], context, partials, originalTemplate, config);
  }
  return buffer;
} as any;

export async function renderAsync(...args: Parameters<typeof Mustache.render>) {
  return defaultWriter.render(...args);
}
