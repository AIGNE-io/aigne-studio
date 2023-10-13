import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

import { BlockletStatus } from '@blocklet/constant';
import { call } from '@blocklet/sdk/lib/component';
import { Events, components, events } from '@blocklet/sdk/lib/config';
import { sha3_256 } from 'js-sha3';

import logger from './logger';

async function handleResource() {
  try {
    const imageFolderPath = path.join(__dirname, '..', 'images');

    if (!statSync(imageFolderPath).isDirectory()) {
      return;
    }

    const files = readdirSync(imageFolderPath);

    if (files && files.length > 0) {
      const list = files.map((filepath: string) => {
        const exportFile = path.join(imageFolderPath, filepath);
        const data = readFileSync(exportFile, 'base64');
        const filename = sha3_256(data);
        return { base64: data, filename };
      });

      // // eslint-disable-next-line no-await-in-loop
      // const found = await call({
      //   name: 'image-bin',
      //   path: '/api/uploads',
      //   method: 'GET',
      //   data: { tags: 'default-project-icon' },
      // });

      // console.log(found);

      for (const item of list) {
        // eslint-disable-next-line no-await-in-loop
        await call({
          name: 'image-bin',
          path: '/api/sdk/uploads',
          method: 'POST',
          data: {
            type: 'base64',
            filename: `${item.filename}.png`,
            data: item.base64,
            tags: 'default-project-icon',
          },
        });
      }
    }
  } catch (err) {
    logger.error(err);
  }
}

const handleResources = (componentList: typeof components) => {
  const imageBinDid = 'z8ia1mAXo8ZE7ytGF36L5uBf9kD2kenhqFGp9';
  const found = componentList.find((x) => x.did === imageBinDid);

  if (found && found.status === BlockletStatus.running) {
    handleResource();
  }
};

export default function initResource() {
  handleResources(components);
  events.on(Events.componentStarted, handleResources);
}
