export interface RepositoryOptions {
  root: string;
}

export default class Repository {
  constructor(readonly options: RepositoryOptions) {}
}
