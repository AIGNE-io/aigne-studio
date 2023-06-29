declare module 'vite-plugin-blocklet';

declare module 'express-history-api-fallback';

declare module 'express-async-errors';

declare module 'express-sse';

namespace Express {
  interface Request {
    user?: {
      did: string;
      role: string;
      fullName: string;
    };
  }
}

declare module '@abtnode/timemachine' {
  export interface GitCommit {
    tree: string;
    author: GitAuthor;
    message: string;
    hash: string;
  }

  export interface GitAuthor {
    name: string;
    email: string;
    date: {
      seconds: number;
      offset: number;
    };
  }

  export default class TimeMachine {
    constructor(options: {
      sources: string | string[] | (() => string | Buffer | Uint8Array | ReadonlyArray<number>);
      sourcesBase: string;
      targetDir: string;
    });

    hasSnapshot(hash: string): Promise<boolean>;

    exportSnapshot(hash: string): Promise<{ [key: string]: string }>;

    listSnapshots(limit?: number): Promise<[] | ReadableStream<GitCommit>>;

    takeSnapshot(message: string, author: Pick<GitAuthor, 'name' | 'email'>, dryRun = false): Promise<string>;

    getLastSnapshot(shallow: true): Promise<string>;
    getLastSnapshot(shallow?: false): Promise<GitCommit & { commitHash: string }>;

    destroy();
  }
}
