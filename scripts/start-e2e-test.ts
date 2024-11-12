#!/usr/bin/env -S node -r dotenv/config -r ts-node/register

/* eslint-disable import/no-extraneous-dependencies,no-console */
import { argv } from 'zx';

console.log('process.env.COMPONENT_STORE_URL', process.env.COMPONENT_STORE_URL);
console.log('process.env.ROOT_SEED', process.env.ROOT_SEED);
console.log('argv', argv.rootSeed, argv);
