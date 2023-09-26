import express from 'express';
import expressWs from 'express-ws';

const app = express();
expressWs(app);

export default app;
