const isBracketStartAndEnd = (text: string) => {
  const pattern = /^\{\{(.*)\}\}$/;
  const match = text.match(pattern);
  return match;
};

function splitText(text: string) {
  const pattern = /(\{\{.*?\}\})/;
  const result = text.split(pattern);
  return result;
}

function hasBrackets(text: string) {
  const pattern = /\{\{(.*?)\}\}/;
  return pattern.test(text);
}

export { hasBrackets, isBracketStartAndEnd, splitText };
