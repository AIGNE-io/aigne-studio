import config from '@blocklet/sdk/lib/config';

import updateDiscussKnowledge from './update-discuss-knowledge';

const timeMap: { [key: string]: string } = {
  '1': '0 * * * * *',
  '10': '0 */10 * * * *',
  '30': '0 */30 * * * *',
  '60': '0 0 * * * *',
  '180': '0 0 */3 * * *',
  '360': '0 0 */6 * * *',
  '720': '0 0 */12 * * *',
  '1440': '0 0 0 * * *',
};

const jobs = () => {
  const time = timeMap[config.env.preferences.autoUpdateTime] || timeMap['60'] || '0 0 * * * *';

  return [
    {
      name: 'update-discuss-kit-knowledge',
      time, // 每小时更新
      fn: updateDiscussKnowledge,
      options: { runOnInit: true },
    },
  ];
};

export default jobs;
