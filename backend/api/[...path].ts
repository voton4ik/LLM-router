/**
 * Vercel Serverless Function wrapper for Express backend
 * Deploy this backend as a separate Vercel project; all requests are handled by the Express app.
 * 
 * Note: This file uses CommonJS syntax (require/module.exports) because Vercel compiles
 * TypeScript files in api/ to CommonJS by default.
 */

// Type imports (removed at compile time, no runtime impact)
type VercelRequest = import('@vercel/node').VercelRequest;
type VercelResponse = import('@vercel/node').VercelResponse;

let app: any = null;

function getExpressApp() {
  if (app) return app;

  try {
    // From backend/api/ require backend/dist (same project)
    // Use relative path - Vercel resolves from api/ directory
    app = require('../dist/server-app.js');
  } catch (err) {
    console.error('Backend not compiled:', err);
    throw new Error('Backend not compiled. Run "npm run build" in the backend directory.');
  }

  return app.default || app;
}

module.exports = async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req && req.method ? req.method : '').toUpperCase();
  const headers = req && req.headers ? req.headers : {};
  const origin = (headers.origin || headers.Origin || '') as string;
  const defaultOrigin = 'https://oneprompt-front.vercel.app';
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((u: string) => u.trim())
    .filter(Boolean);
  const allowedOrigins = envOrigins.length ? envOrigins : [defaultOrigin];
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] || defaultOrigin);

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin || defaultOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'X-Chat-Session-Id',
    'Access-Control-Max-Age': '86400',
  };

  // Preflight: ответить сразу 200 с заголовками, без загрузки Express
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
  res.setHeader('Access-Control-Allow-Credentials', corsHeaders['Access-Control-Allow-Credentials']);
  res.setHeader('Access-Control-Expose-Headers', corsHeaders['Access-Control-Expose-Headers']);
  res.setHeader('Access-Control-Max-Age', corsHeaders['Access-Control-Max-Age']);

  try {
    const expressApp = getExpressApp();

    // Path: prefer req.url (pathname) so /api/health is correct; fallback to req.query.path (catch-all param)
    let fullPath: string;
    let queryString = '';
    if (req.url) {
      const idx = req.url.indexOf('?');
      fullPath = idx >= 0 ? req.url.slice(0, idx) : req.url;
      queryString = idx >= 0 ? req.url.slice(idx + 1) : '';
      if (!fullPath.startsWith('/api')) {
        const pathArray = Array.isArray(req.query.path)
          ? req.query.path
          : req.query.path
            ? [req.query.path]
            : [];
        fullPath = pathArray.length > 0 ? `/api/${pathArray.join('/')}` : '/api';
      }
    } else {
      const pathArray = Array.isArray(req.query.path)
        ? req.query.path
        : req.query.path
          ? [req.query.path]
          : [];
      fullPath = pathArray.length > 0 ? `/api/${pathArray.join('/')}` : '/api';
    }
    fullPath = fullPath || '/api';
    const fullUrl = queryString ? `${fullPath}?${queryString}` : fullPath;

    const expressReq = {
      method: req.method,
      url: fullUrl,
      path: fullPath,
      query: req.query,
      headers: req.headers,
      body: req.body,
      params: {},
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      protocol: req.headers['x-forwarded-proto'] || 'https',
      secure: true,
      hostname: req.headers.host,
      originalUrl: fullUrl,
      baseUrl: '',
      route: null,
    } as any;

    const expressRes = {
      statusCode: 200,
      status: (code: number) => {
        expressRes.statusCode = code;
        res.status(code);
        return expressRes;
      },
      json: (data: any) => {
        res.status(expressRes.statusCode).json(data);
        return expressRes;
      },
      send: (data: any) => {
        res.status(expressRes.statusCode).send(data);
        return expressRes;
      },
      setHeader: (name: string, value: string | string[]) => {
        res.setHeader(name, value);
        return expressRes;
      },
      getHeader: (name: string) => res.getHeader(name),
      end: (data?: any) => {
        if (data) res.send(data);
        res.end();
        return expressRes;
      },
      redirect: (url: string) => {
        res.redirect(url);
        return expressRes;
      },
      cookie: () => expressRes,
      clearCookie: () => expressRes,
    } as any;

    return new Promise<void>((resolve) => {
      expressApp(expressReq, expressRes, (err?: any) => {
        if (err) {
          console.error('Express error:', err);
          res.status(500).json({ error: err.message || 'Internal server error' });
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};
