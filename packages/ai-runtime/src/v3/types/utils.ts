export type OrderedMap<T extends { id: string }> = Record<string, T> & {
  $indexes: string[];
};
