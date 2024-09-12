import { ReadableStream } from 'stream';

export async function fetch(...args: Parameters<typeof globalThis.fetch>) {
  return __blocklet_quickjs_builtin__.fetch(...args).then((res) => {
    return {
      ...res,
      body: new ReadableStream({
        async start(controller) {
          try {
            const reader = res.body!.getReader();
            for (;;) {
              const d = await reader.read();
              if (d.done) break;
              controller.enqueue(d.value);
            }
          } catch (error) {
            controller.error(error);
          }
          controller.close();
        },
      }),
    };
  });
}
