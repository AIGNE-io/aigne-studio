const rimraf = require('rimraf');

const dirs = ['.blocklet', 'dist', 'api/dist'];

for (const dir of dirs) {
  console.log(`clean ${dir} folder`);
  rimraf.sync(dir);
  console.log(`clean ${dir} folder done!`);
}
