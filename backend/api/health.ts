/**
 * Standalone health endpoint: GET /api/health
 * Does not depend on Express or [...path]. Returns 200 + JSON. CORS allows *.
 */

let pool: any = null;
try {
  const db = require('../dist/config/database.js');
  pool = db.default || db;
} catch (e) {
  // dist not built or config missing
}

module.exports = async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!pool) {
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'unavailable',
      error: 'Backend not built or DATABASE_URL not set',
    });
  }

  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error && error.message ? error.message : 'Unknown error',
    });
  }
};
