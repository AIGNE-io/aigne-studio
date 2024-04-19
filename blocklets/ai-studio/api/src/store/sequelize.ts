// NOTE: add next line to keep sqlite3 in the bundle
import 'sqlite3';

import { NextFunction, Request, Response } from 'express';
import { Sequelize } from 'sequelize';

import { Config } from '../libs/env';
import logger from '../libs/logger';

const url = `sqlite:${Config.dataDir}/aistudio.db`;

export const sequelize = new Sequelize(url, {
  logging: Config.verbose === false ? false : logger.info.bind(logger),
});

// Append req, res type check to Model to avoid error in other places
declare module 'sequelize' {
  // add AttachReqResOptions to Hookable
  interface Hookable {
    req?: Request;
    res?: Response;
  }
}

// Append req, res params to Model Middleware
export function attachReqResToOptionsMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const addReqResToModel = (_: any, options: any) => {
        if (options) {
          options.req = req;
          options.res = res;
        }
      };
      sequelize.addHook('beforeUpdate', addReqResToModel);
      sequelize.addHook('beforeDestroy', addReqResToModel);
    } catch (e) {
      console.error(e);
    }
    // always call next
    return next();
  };
}
