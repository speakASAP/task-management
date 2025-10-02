// main.ts
// Simple Express server setup for running in a container.
// You most likely want to replace this with your own server code.

import express from 'express';
import { Request, Response } from 'express';

const app = express();

app.get('/', (_req: Request, res: Response) => {
    res.send('Server is running!');
});

app.listen(3000, () => {
    console.log(`Server listening on port 3000`);
});
