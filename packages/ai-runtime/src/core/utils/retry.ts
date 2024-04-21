export default async function retry(fn: () => any, retries: number) {
  let i = 0;

  for (;;) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (i < retries) {
        i++;
      } else {
        throw error;
      }
    }
  }
}
