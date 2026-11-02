import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import publicRoutes from './routes/publicRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { connectMongo } from './db/connectMongo.js';
import { seedDefaults } from './data/seedDefaults.js';
import { ensureDefaultAdmin } from './data/seedAdmin.js';
import {
  resolveRouteSeo,
  injectSeoIntoHtml,
  generateSitemapXml,
  CANONICAL_DOMAIN,
} from './seo/seoMetadata.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
let dbReady = false;
let dbLastError = null;

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean)
  : [];

const localhostOriginPattern = /^https?:\/\/localhost:\d+$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.length === 0) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (localhostOriginPattern.test(origin)) return true;
  return false;
}

// Canonical host normalization (redirect www to non-www in production)
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (isProduction && host.startsWith('www.')) {
    const cleanHost = host.replace(/^www\./, '');
    return res.redirect(301, `https://${cleanHost}${req.originalUrl}`);
  }
  return next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
    );
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.json({ limit: '1mb' }));
if (!isProduction) {
  app.use('/assets', express.static(path.join(__dirname, '../src/assets')));
  app.get('/', (_req, res) => {
    return res.redirect('http://localhost:5173');
  });
  app.get('/admin', (_req, res) => {
    return res.redirect('http://localhost:5174');
  });
}
app.use('/uploads', express.static(path.join(__dirname, './uploads')));
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    dbReady,
    dbError: dbLastError ? String(dbLastError.message || dbLastError) : null,
  });
});

app.use('/api', (req, res, next) => {
  if (dbReady) return next();
  if (req.path === '/health' || req.path === '/admin/login') return next();
  return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
});
app.use('/api', publicRoutes);
app.use('/api', adminRoutes);

// SEO Infrastructure Endpoints
app.get('/robots.txt', (_req, res) => {
  const robotsPath = path.resolve(__dirname, '../public/robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(robotsPath);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${CANONICAL_DOMAIN}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const xml = await generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(xml);
  } catch (err) {
    console.error('Failed to generate dynamic sitemap:', err);
    const staticSitemap = path.resolve(__dirname, '../public/sitemap.xml');
    if (fs.existsSync(staticSitemap)) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.sendFile(staticSitemap);
    }
    return res.status(500).send('Error generating sitemap');
  }
});

app.get('/sitemap-pages.xml', (_req, res) => {
  const filePath = path.resolve(__dirname, '../public/sitemap-pages.xml');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.sendFile(filePath);
  }
  return res.redirect(301, '/sitemap.xml');
});

app.get('/sitemap-blogs.xml', async (_req, res) => {
  const filePath = path.resolve(__dirname, '../public/sitemap-blogs.xml');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.sendFile(filePath);
  }
  return res.redirect(301, '/sitemap.xml');
});

app.get('/sitemap-events.xml', (_req, res) => {
  const filePath = path.resolve(__dirname, '../public/sitemap-events.xml');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.sendFile(filePath);
  }
  return res.redirect(301, '/sitemap.xml');
});

app.get('/llms.txt', (_req, res) => {
  const llmsPath = path.resolve(__dirname, '../public/llms.txt');
  if (fs.existsSync(llmsPath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(llmsPath);
  }
  return res.status(404).send('Not Found');
});

function resolveDir(value, fallbackPath) {
  if (!value) return fallbackPath;
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

if (!isProduction) {
  app.get('/', (_req, res) => {
    res.redirect('http://localhost:5173');
  });
}

if (isProduction) {
  const publicDist = resolveDir(process.env.PUBLIC_DIST_PATH, path.resolve(__dirname, '../dist'));
  const adminDist = resolveDir(process.env.ADMIN_DIST_PATH, path.resolve(__dirname, '../../admin/dist'));
  const publicIndex = path.join(publicDist, 'index.html');
  const adminIndex = path.join(adminDist, 'index.html');

  if (fs.existsSync(adminIndex)) {
    app.use('/admin', express.static(adminDist));
    app.get('/admin/{*route}', (_req, res) => {
      res.sendFile(adminIndex);
    });
  } else {
    console.warn(`Admin build not found at ${adminDist}`);
  }

  if (fs.existsSync(publicIndex)) {
    app.use(
      express.static(publicDist, {
        maxAge: '1y',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );

    app.get('/{*route}', async (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/admin')) {
        return next();
      }

      try {
        const seo = await resolveRouteSeo(req.path);
        let html = fs.readFileSync(publicIndex, 'utf-8');
        html = injectSeoIntoHtml(html, seo);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (seo.canonical) {
          res.setHeader('Link', `<${seo.canonical}>; rel="canonical"`);
        }
        return res.status(seo.statusCode || 200).send(html);
      } catch (err) {
        console.error('Error serving SEO-injected HTML:', err);
        return res.sendFile(publicIndex);
      }
    });
  } else {
    console.warn(`Public build not found at ${publicDist}`);
  }
}

app.use((err, _req, res, _next) => {
  console.error('Express Error:', err);
  if (err?.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum file size allowed is 30MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files selected. Maximum is 50 photos per album.' });
    }
    return res.status(400).json({ error: err.message || 'File upload error' });
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message = typeof err?.message === 'string' ? err.message : 'Internal server error';
  return res.status(status).json({ error: message });
});

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectMongoWithRetry() {
  while (!dbReady) {
    try {
      await connectMongo();
      dbReady = true;
      dbLastError = null;
      console.log('MongoDB connected successfully.');
      try {
        await seedDefaults();
        await ensureDefaultAdmin();
        console.log('Default content & admin verified.');
      } catch (seedErr) {
        console.warn('Seeding note (non-fatal):', seedErr?.message || seedErr);
      }
      return;
    } catch (err) {
      dbReady = false;
      dbLastError = err;
      console.error('MongoDB connection failed. Retrying in 15 seconds...', err?.message || err);
      await wait(15000);
    }
  }
}

async function start() {
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
  void connectMongoWithRetry();
}

start().catch((err) => {
  console.error('Failed to start API server', err);
  process.exit(1);
});
