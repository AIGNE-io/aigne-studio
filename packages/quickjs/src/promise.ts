export const withResolvers = <T>(): PromiseWithResolvers<T> => {
  let resolve: PromiseWithResolvers<T>['resolve'] | undefined;
  let reject: PromiseWithResolvers<T>['reject'] | undefined;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  if (!resolve || !reject) throw new Error('Promise.withResolvers: resolve or reject is undefined');

  return { promise, resolve, reject };
};
