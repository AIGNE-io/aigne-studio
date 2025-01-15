import { Worker } from 'snowflake-uuid';

const taskIdGenerator = new Worker();

export const nextTaskId = () => taskIdGenerator.nextId().toString();
