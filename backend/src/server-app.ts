/**
 * Express App Export (without listen)
 * This file exports the Express app for use in serverless environments
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

dotenv.config();

const app = express();

// CORS: в serverless окружении (Vercel) CORS обрабатывается в api/[...path].ts
// Здесь используем либеральную настройку, чтобы не конфликтовать с handler
// В обычном Express сервере (server.ts) используется более строгая настройка
app.use(
  cors({
    origin: true, // Разрешаем все origin в serverless (контроль в api/[...path].ts)
    credentials: true,
    exposedHeaders: ['X-Chat-Session-Id'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());

// Mount routes
app.use('/api/chat', chatHistoryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/payment', paymentRoutes);

// Health check: доступен по /api/health (для Vercel) и /health (локально)
const healthHandler = async (
  _req: express.Request,
  res: express.Response
) => {
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
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

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

export function createApp() {
  return app;
}

export default app;
