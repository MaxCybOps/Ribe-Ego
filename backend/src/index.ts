import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes/index.js';
import { wsManager } from './utils/wsManager.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// API health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'Ribeègo Backend API', timestamp: new Date() });
});

// Mount API routes
app.use('/api', apiRouter);

const server = http.createServer(app);

// Initialize WebSocket Manager
wsManager.init(server);

server.listen(port, () => {
  console.log(`⚡ Ribeègo Backend running on http://localhost:${port}`);
  console.log(`⚡ Real-time WebSocket listening at ws://localhost:${port}/ws`);
});
