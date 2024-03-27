import fs from 'fs';

import axios from 'axios';

function downloadImage(imageUrl: string, savePath: string) {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream',
    })
      .then((response) => {
        const writer = fs.createWriteStream(savePath);
        response.data.pipe(writer);

        let error: any = null;
        writer.on('error', (err) => {
          error = err;
          writer.close();
          reject(err);
        });

        writer.on('close', () => {
          if (!error) {
            resolve('success');
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export default downloadImage;
