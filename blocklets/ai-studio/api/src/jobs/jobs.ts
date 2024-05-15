import updateDiscussKnowledge from './update-discuss-knowledge';

const jobs = [
  {
    name: 'update-discuss-kit-knowledge',
    time: '0 * * * * *', // 每分钟
    fn: updateDiscussKnowledge,
    options: { runOnInit: true },
  },
];

export default jobs;
