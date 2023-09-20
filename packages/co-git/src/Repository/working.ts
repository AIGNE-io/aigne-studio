import fs from 'fs';
import path from 'path';

import { syncedStore } from '@syncedstore/core';
import { MappedTypeDescription } from '@syncedstore/core/types/doc';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { uuidv4 } from 'lib0/random';
import debounce from 'lodash/debounce';
import difference from 'lodash/difference';
import type { WebSocket } from 'ws';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { readSyncMessage, writeSyncStep1, writeUpdate } from 'y-protocols/sync';
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs';

import type Repository from './repository';

const autoSaveTimeout = 10000;
const pingTimeout = 30000;
const messageSync = 0;
const messageAwareness = 1;
const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

export interface WorkingOptions {
  ref: string;
  root: string;
}

export type WorkingStore<T> = {
  files: { [key: string]: T };
  tree: { [key: string]: string };
};

export default class Working<T> extends Doc {
  constructor(readonly repo: Repository<T>, readonly options: WorkingOptions) {
    super();

    try {
      const { yjsPath } = this;
      if (fs.existsSync(yjsPath)) {
        applyUpdate(this, fs.readFileSync(yjsPath));
      }
    } catch (error) {
      console.error(`co-git: apply update from file ${this.yjsPath} error`, error);
    }

    this.on('update', this.updateHandler);

    this.awareness = new Awareness(this);
    this.awareness.on('update', this.awarenessChangeHandler);

    this.syncedStore = syncedStore({ files: {}, tree: {} }, this);
  }

  syncedStore: MappedTypeDescription<WorkingStore<T>>;

  private get yjsPath() {
    return path.join(this.options.root, 'state.yjs');
  }

  async reset() {
    const files = await Promise.all(
      (
        await this.repo.listFiles({ ref: this.options.ref })
      ).map(async (filepath) => {
        const content = (await this.repo.readBlob({ ref: this.options.ref, filepath })).blob;
        return { filepath, file: await this.repo.options.parse(filepath, content) };
      })
    );

    this.transact(() => {
      this.getMap('files').clear();
      this.getMap('tree').clear();
      for (const { filepath, file } of files) {
        const key = uuidv4();
        this.syncedStore.files[key] = file;
        this.syncedStore.tree[key] = filepath;
      }
    });
  }

  async commit({
    ref,
    branch,
    message,
    author,
  }: {
    ref: string;
    branch?: string;
    message: string;
    author: {
      name: string;
      email?: string;
      timestamp?: number;
      timezoneOffset?: number;
    };
  }) {
    const res = await this.repo.run(async (tx) => {
      if (branch && branch !== ref) {
        await this.repo.branch({ ref: branch, object: ref });
      } else {
        if (!(await this.repo.listBranches()).includes(ref)) {
          throw new Error('branch is required when committing from a history');
        }
        await tx.checkout({ ref });
      }

      const originalFiles = await this.repo.listFiles({ ref });

      const files = this.files();

      const deletedFiles = difference(
        originalFiles,
        files.map((i) => i[0])
      );

      for (const filepath of deletedFiles) {
        fs.rmSync(filepath, { recursive: true, force: true });
        await tx.add({ filepath });
      }

      for (const [filepath, file] of files) {
        const p = path.join(this.repo.options.root, filepath);
        fs.mkdirSync(path.dirname(p), { recursive: true });

        fs.writeFileSync(p, await this.repo.options.stringify(filepath, file));

        await tx.add({ filepath });
      }

      return tx.commit({ message, author });
    });

    await this.reset();

    return res;
  }

  files(): [string, T][] {
    return Object.entries(this.syncedStore.tree)
      .map(([key, filepath]) => {
        return [filepath, this.syncedStore.files[key]] as const;
      })
      .filter((i): i is [string, T] => typeof i[0] === 'string');
  }

  file(filepath: string): Doc | undefined {
    return this.getMap<Doc>().get(filepath);
  }

  private conns = new globalThis.Map<WebSocket, Set<number>>();

  private awareness: Awareness;

  private awarenessChangeHandler = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    conn: WebSocket
  ) => {
    const changedClients = added.concat(updated, removed);
    if (conn !== null) {
      const connControlledIDs = this.conns.get(conn);
      if (connControlledIDs) {
        added.forEach((clientID) => {
          connControlledIDs.add(clientID);
        });
        removed.forEach((clientID) => {
          connControlledIDs.delete(clientID);
        });
      }
    }
    // broadcast awareness update
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changedClients));
    const buff = encoding.toUint8Array(encoder);
    this.conns.forEach((_, conn) => this.send(conn, buff));
  };

  private send = (conn: WebSocket, m: Uint8Array) => {
    if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
      this.closeConn(conn);
    }
    try {
      conn.send(m, (err) => {
        if (err) this.closeConn(conn);
      });
    } catch (e) {
      this.closeConn(conn);
    }
  };

  private closeConn = (conn: WebSocket) => {
    conn.removeAllListeners();
    if (this.conns.has(conn)) {
      const controlledIds = this.conns.get(conn);
      this.conns.delete(conn);
      if (controlledIds) {
        removeAwarenessStates(this.awareness, Array.from(controlledIds), null);
      }
    }
    conn.close();
  };

  addConnection(conn: WebSocket) {
    if (this.conns.has(conn)) {
      return;
    }

    this.conns.set(conn, new Set());
    conn.on('message', (message) => this.messageListener(conn, new Uint8Array(message as ArrayBuffer)));

    let pongReceived = true;
    const pingInterval = setInterval(() => {
      if (!pongReceived) {
        if (this.conns.has(conn)) {
          this.closeConn(conn);
        }
        clearInterval(pingInterval);
      } else if (this.conns.has(conn)) {
        pongReceived = false;
        try {
          conn.ping();
        } catch (e) {
          this.closeConn(conn);
          clearInterval(pingInterval);
        }
      }
    }, pingTimeout);

    conn.on('close', () => {
      this.closeConn(conn);
      clearInterval(pingInterval);
    });

    conn.on('pong', () => {
      pongReceived = true;
    });

    // put the following in a variables in a block so the interval handlers don't keep in scope
    {
      // send sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      writeSyncStep1(encoder, this);
      this.send(conn, encoding.toUint8Array(encoder));
      const awarenessStates = this.awareness.getStates();
      if (awarenessStates.size > 0) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, Array.from(awarenessStates.keys())));
        this.send(conn, encoding.toUint8Array(encoder));
      }
    }
  }

  private updateHandler = (update: Uint8Array) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    this.conns.forEach((_, conn) => this.send(conn, message));
  };

  private messageListener = (conn: WebSocket, message: Uint8Array) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          readSyncMessage(decoder, encoder, this, null);

          // If the `encoder` only contains the type of reply message and no
          // message, there is no need to send the message. When `encoder` only
          // contains the type of reply, its length is 1.
          if (encoding.length(encoder) > 1) {
            this.send(conn, encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness: {
          applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), conn);
          break;
        }
        default: {
          console.warn(`Unsupported messageType ${messageType}`);
        }
      }
    } catch (err) {
      console.error(err);
      this.emit('error', [err]);
    }

    this.save();
  };

  private autoSave = debounce(() => {
    const { yjsPath } = this;
    const blob = encodeStateAsUpdate(this);
    fs.mkdirSync(path.dirname(yjsPath), { recursive: true });
    fs.writeFileSync(yjsPath, blob);
  }, autoSaveTimeout);

  save = ({ flush = false }: { flush?: boolean } = {}) => {
    this.autoSave();
    if (flush) this.autoSave.flush();
  };
}
