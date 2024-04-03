import { ReadableStream } from 'stream/web';

(globalThis as any).ReadableStream = ReadableStream;
