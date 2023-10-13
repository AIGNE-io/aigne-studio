import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

import { BlockletStatus } from '@blocklet/constant';
import { call } from '@blocklet/sdk/lib/component';
import { Events, components, events } from '@blocklet/sdk/lib/config';
import { Worker } from 'snowflake-uuid';

import logger from './logger';

const idGenerator = new Worker();
const nextId = () => idGenerator.nextId().toString();

async function handleResource() {
  try {
    const imageFolderPath = path.join(__dirname, '..', 'images');

    if (!statSync(imageFolderPath).isDirectory()) {
      return;
    }

    const files = readdirSync(imageFolderPath);

    if (files && files.length > 0) {
      const base64s = files.map((filepath: string) => {
        const exportFile = path.join(imageFolderPath, filepath);
        const data = readFileSync(exportFile, 'base64');
        return data;
      });

      const generateFilename = () => `${Date.now()}-${nextId()}`;

      for (const base64 of base64s) {
        // eslint-disable-next-line no-await-in-loop
        await call({
          name: 'image-bin',
          path: '/api/sdk/uploads',
          method: 'POST',
          data: {
            type: 'base64',
            filename: `${generateFilename()}.png`,
            data: base64,
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
