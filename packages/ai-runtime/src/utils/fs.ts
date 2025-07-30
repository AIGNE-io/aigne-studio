import fs from 'fs';
import path from 'path';

export async function copyFile(
  src: string,
  dest: string,
  { skip }: { skip?: (src: string) => boolean } = {}
): Promise<void> {
  if (skip?.(src)) return;

  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);

    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);

    readStream.pipe(writeStream);
  });
}

export async function copyDirectory(
  src: string,
  dest: string,
  { skip }: { skip?: (src: string) => boolean } = {}
): Promise<void> {
  if (skip?.(src)) return;

  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, { skip });
    } else {
      await copyFile(srcPath, destPath, { skip });
    }
  }
}

export async function copyRecursive(
  src: string,
  dest: string,
  { skip }: { skip?: (src: string) => boolean } = {}
): Promise<void> {
  if (skip?.(src)) return;

  const srcStats = await fs.promises.stat(src);

  if (srcStats.isDirectory()) {
    await copyDirectory(src, dest, { skip });
  } else {
    await copyFile(src, dest, { skip });
  }
}
