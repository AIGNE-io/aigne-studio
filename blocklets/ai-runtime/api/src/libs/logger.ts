import createLogger from '@blocklet/logger';
import config from '@blocklet/sdk/lib/config';
import { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

export const isDevelopment = config.env.mode === 'development';

const logger = createLogger('aigne-runtime:main');

export default logger;

const accessLogStream = createLogger.getAccessLogStream();

const morganInstance = morgan(isDevelopment ? 'dev' : 'combined', { stream: accessLogStream });

export const accessLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (isDevelopment) {
    if (['/node_modules/.vite', '/src', '/@'].some((p) => req.originalUrl.startsWith(p))) {
      next();
      return;
    }
  }

  morganInstance(req, res, next);
};

export function registerLoggerToConsole() {
  const format = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    const obj =
      typeof args[0] === 'string' ? (args.length === 2 && typeof args[1] === 'object' ? args[1] : args.slice(1)) : args;

    return [message, obj];
  };

  // eslint-disable-next-line no-console
  console.log = (...args: any[]) => logger.info.call(logger, ...format(...args));
  // eslint-disable-next-line no-console
  console.debug = (...args: any[]) => logger.debug.call(logger, ...format(...args));
  // eslint-disable-next-line no-console
  console.error = (...args: any[]) => logger.error.call(logger, ...format(...args));
  // eslint-disable-next-line no-console
  console.warn = (...args: any[]) => logger.warn.call(logger, ...format(...args));
}
