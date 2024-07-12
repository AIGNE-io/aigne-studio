import { readFile } from 'fs/promises';
import path from 'path';

import { syncedStore } from '@syncedstore/core';
import { MappedTypeDescription } from '@syncedstore/core/types/doc';
import { mkdir, pathExists, writeFile } from 'fs-extra';
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

const YJS_STATE_FILE_PATH = (root: string) => path.join(root, 'state.yjs');

const WORKING_DIR = (root: string) => path.join(root, 'working');

export default class Working<T> extends Doc {
  static async load<T>(repo: Repository<T>, options: WorkingOptions) {
    const yjsPath = YJS_STATE_FILE_PATH(options.root);
    const initial = (await pathExists(yjsPath)) ? await readFile(yjsPath) : undefined;
    return new Working<T>(repo, options, { initial });
  }

  private constructor(
    readonly repo: Repository<T>,
    readonly options: WorkingOptions,
    { initial }: { initial?: Buffer }
  ) {
    super();

    try {
      if (initial) applyUpdate(this, initial);
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
    return YJS_STATE_FILE_PATH(this.options.root);
  }

  get workingDir() {
    return WORKING_DIR(this.options.root);
  }

  async reset() {
    await this.repo.checkout({ dir: this.workingDir, ref: this.options.ref, force: true });

    const files = await Promise.all(
      (await this.repo.listFiles({ ref: this.options.ref })).map(async (p) => {
        const content = (await this.repo.readBlob({ ref: this.options.ref, filepath: p })).blob;
        return this.repo.options.parse(p, content, { ref: this.options.ref });
      })
    );

    this.transact(() => {
      this.getMap('files').clear();
      this.getMap('tree').clear();
      for (const item of files) {
        if (item) {
          const { filepath, key, data: file } = item;
          this.syncedStore.files[key] = file;
          this.syncedStore.tree[key] = filepath;
        }
      }
    });
  }

  async commit({
    ref,
    branch,
    message,
    author,
    skipCommitIfNoChanges,
    beforeCommit,
    beforeTransact,
  }: {
    ref: string;
    branch: string;
    message: string;
    author: NonNullable<Parameters<Transaction<T>['commit']>[0]>['author'];
    skipCommitIfNoChanges?: boolean;
    beforeCommit?: (options: { tx: Transaction<T> }) => any;
    beforeTransact?: (options: { tx: Transaction<T> }) => any;
  }) {
    const res = await this.repo.transact(async (tx) => {
      const object = await this.repo.resolveRef({ ref });

      // Create branch if needed
      const branches = await this.repo.listBranches();
      if (!branches.includes(branch)) {
        await this.repo.branch({ ref: branch, object });
      }

      await beforeTransact?.({ tx });

      const files = this.files();
      for (const [originalFilepath, file] of files) {
        let fileObjects = await this.repo.options.stringify(originalFilepath, file);

        if (!fileObjects) continue;

        if (!Array.isArray(fileObjects)) {
          fileObjects = [fileObjects];
        }

        for (const { filepath, data } of fileObjects) {
          const newPath = path.join(this.workingDir, filepath);
          await mkdir(path.dirname(newPath), { recursive: true });
          await writeFile(newPath, data);
        }
      }

      await beforeCommit?.({ tx });

      await tx.add({ dir: this.workingDir, filepath: '.' });

      if (skipCommitIfNoChanges) {
        const changes = await this.repo.statusMatrix({ dir: this.workingDir });
        if (changes.every((i) => i[1] === 1 && i[2] === 1 && i[3] === 1)) {
          return undefined;
        }
      }

      return tx.commit({ dir: this.workingDir, message, author });
    });

    if (!res) return res;

    if (this.options.ref !== branch) {
      await this.repo.working({ ref: branch }).then((w) => w.reset());
    }
    await this.reset();

    await this.save({ flush: true });

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

  private autoSave = debounce(async () => {
    const { yjsPath } = this;
    const blob = encodeStateAsUpdate(this);
    await mkdir(path.dirname(yjsPath), { recursive: true });
    await writeFile(yjsPath, blob);
  }, autoSaveTimeout);

  save = async ({ flush = false }: { flush?: boolean } = {}) => {
    await this.autoSave();
    if (flush) await this.autoSave.flush();
  };

  override destroy() {
    this.autoSave.cancel();
    super.destroy();
  }
}
