const fs = require('fs');
const path = require('path');

function copyFolderRecursive(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination);
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destinationPath = path.join(destination, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderRecursive(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  });
}

const imageFolderPath = path.join(__dirname, '..', 'api/src/images');
const targetFolderPath = path.join(__dirname, '..', 'api/dist/images');

console.log(imageFolderPath);

copyFolderRecursive(imageFolderPath, targetFolderPath);
