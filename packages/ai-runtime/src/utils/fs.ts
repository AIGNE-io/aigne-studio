import fs from 'fs';
import path from 'path';

export function copyFile(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);

    readStream.pipe(writeStream);
  });
}

export async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

export async function copyRecursive(src: string, dest: string): Promise<void> {
  const srcStats = await fs.promises.stat(src);

  if (srcStats.isDirectory()) {
    await copyDirectory(src, dest);
  } else {
    await copyFile(src, dest);
  }
}
