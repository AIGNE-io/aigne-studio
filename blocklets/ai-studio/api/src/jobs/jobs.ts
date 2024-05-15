import checkKnowledge from './check-knowledge';

const jobs = [
  {
    name: 'check-discuss-kit-knowledge',
    time: '0 * * * * *', // 每分钟
    fn: checkKnowledge,
    options: { runOnInit: true },
  },
];

export default jobs;
