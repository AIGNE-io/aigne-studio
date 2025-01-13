export type UnionToIntersection<U> = (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
  ? I
  : never;

export type ObjectUnionToIntersection<T> = UnionToIntersection<T> extends object ? UnionToIntersection<T> : never;
