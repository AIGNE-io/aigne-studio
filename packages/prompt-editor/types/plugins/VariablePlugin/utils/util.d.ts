declare const isBracketStartAndEnd: (text: string) => RegExpMatchArray | null;
declare function splitText(text: string): string[];
declare function hasBrackets(text: string): boolean;
export { hasBrackets, isBracketStartAndEnd, splitText };
