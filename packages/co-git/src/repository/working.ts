import fs from 'fs';
import path from 'path';

import { syncedStore } from '@syncedstore/core';
import { MappedTypeDescription } from '@syncedstore/core/types/doc';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import debounce from 'lodash/debounce';
import type { WebSocket } from 'ws';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import { readSyncMessage, writeSyncStep1, writeUpdate } from 'y-protocols/sync';
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs';

import type Repository from './repository';
import type { Transaction } from './repository';

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
  constructor(
    readonly repo: Repository<T>,
    readonly options: WorkingOptions
  ) {
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

  readonly syncedStore: MappedTypeDescription<WorkingStore<T>>;

  private get yjsPath() {
    return path.join(this.options.root, 'state.yjs');
  }

  async reset() {
    const files = await Promise.all(
      (await this.repo.listFiles({ ref: this.options.ref })).map(async (p) => {
        const content = (await this.repo.readBlob({ ref: this.options.ref, filepath: p })).blob;
        const { filepath, data, key } = await this.repo.options.parse(p, content, { ref: this.options.ref });
        return { filepath, key, file: data };
      })
    );

    this.transact(() => {
      this.getMap('files').clear();
      this.getMap('tree').clear();
      for (const { filepath, key, file } of files) {
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
    beforeCommit,
  }: {
    ref: string;
    branch: string;
    message: string;
    author: NonNullable<Parameters<Transaction<T>['commit']>[0]>['author'];
    beforeCommit?: (options: { tx: Transaction<T> }) => any;
  }) {
    const res = await this.repo.transact(async (tx) => {
      const object = await this.repo.resolveRef({ ref });

      // Create branch if needed
      const branches = await this.repo.listBranches();
      if (!branches.includes(branch)) {
        await this.repo.branch({ ref: branch, object });
      }

      // Checkout
      await tx.checkout({ ref: branch, force: true });

      // Delete all files
      const originalFiles = await this.repo.listFiles({ ref: branch });
      for (const filepath of originalFiles) {
        fs.rmSync(path.join(this.repo.root, filepath), { recursive: true, force: true });
        await tx.remove({ filepath });
        await fs.rmSync(path.join(this.repo.options.root, filepath), { force: true });
      }

      // Add all files from working
      const files = this.files();
      for (const [originalFilepath, file] of files) {
        let fileObjects = await this.repo.options.stringify(originalFilepath, file);

        if (!fileObjects) continue;

        if (!Array.isArray(fileObjects)) {
          fileObjects = [fileObjects];
        }

        for (const { filepath, data } of fileObjects) {
          const newPath = path.join(this.repo.options.root, filepath);
          fs.mkdirSync(path.dirname(newPath), { recursive: true });
          fs.writeFileSync(newPath, data);

          await tx.add({ filepath });
        }
      }

      await beforeCommit?.({ tx });

      return tx.commit({ message, author });
    });

    if (this.options.ref !== branch) {
      await this.repo.working({ ref: branch }).then((w) => w.reset());
    }
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

  addConnection(conn: WebSocket, { readOnly }: { readOnly?: boolean } = {}) {
    conn.binaryType = 'arraybuffer';

    if (this.conns.has(conn)) {
      return;
    }

    this.conns.set(conn, new Set());
    conn.on('message', (message) => {
      const data = new Uint8Array(message as ArrayBuffer);
      if (readOnly && data[0] === 0 && (data[1] === 1 || data[1] === 2)) return;
      this.messageListener(conn, data);
    });

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

  override destroy() {
    this.autoSave.cancel();
    super.destroy();
  }
}
