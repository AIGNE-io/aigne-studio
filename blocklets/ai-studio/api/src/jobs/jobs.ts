import updateDiscussKnowledge from './update-discuss-knowledge';

const jobs = [
  {
    name: 'update-discuss-kit-knowledge',
    time: '0 0 * * * *', // 每小时更新
    fn: updateDiscussKnowledge,
    options: { runOnInit: true },
  },
];

export default jobs;
