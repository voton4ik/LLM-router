/**
 * Express Server Entry Point
 * Main server configuration and startup
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';

import chatRoutes from './routes/chat';
import chatHistoryRoutes from './routes/chat-history.routes';
import authRoutes from './routes/auth.routes';
import balanceRoutes from './routes/balance.routes';
import paymentRoutes from './routes/payment.routes';
import { closeChatDb } from './config/chat-database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    exposedHeaders: ['X-Chat-Session-Id'],
  })
);
app.use(express.json());

// Mount chat-history first so /api/chat/sessions is matched; then POST /api/chat for streaming
app.use('/api/chat', chatHistoryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  }
);

process.on('SIGTERM', async () => {
  await Promise.all([pool.end(), closeChatDb()]);
  process.exit(0);
});

// Test database connection BEFORE starting server
pool
  .query('SELECT NOW()')
  .then(() => {
    app.listen(PORT);
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    console.error('Check your DATABASE_URL in .env file');
    process.exit(1);
  });
