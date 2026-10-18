// Lightweight Built-in Node.js Server for Gamer Quantum Calculator & Operator Portal
// Zero external dependencies needed - uses native Node.js standard libraries

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const KEYS_FILE = path.join(DATA_DIR, 'keys.json');

// Ensure data folder and initial keys.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(KEYS_FILE)) {
  const initialKeys = [
    {
      id: 'seed_key_1',
      key: 'CYBER-2026-ALPHA',
      label: 'Genesis Key',
      type: 'multi',
      status: 'active',
      createdAt: Date.now() - 3600000,
      expiresAt: null,
      usageCount: 0,
      maxUses: null,
      lastUsed: null
    },
    {
      id: 'seed_key_2',
      key: 'OPERATOR-VIP-777',
      label: 'Operator VIP Pass',
      type: 'multi',
      status: 'active',
      createdAt: Date.now() - 1800000,
      expiresAt: null,
      usageCount: 0,
      maxUses: null,
      lastUsed: null
    }
  ];
  fs.writeFileSync(KEYS_FILE, JSON.stringify(initialKeys, null, 2), 'utf-8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Set CORS headers for flexible local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTING ---
  if (pathname === '/api/keys') {
    if (req.method === 'GET') {
      try {
        const raw = fs.readFileSync(KEYS_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(raw);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read keys' }));
      }
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1e6) req.connection.destroy(); // 1MB protection
      });

      req.on('end', () => {
        try {
          const keys = JSON.parse(body);
          if (Array.isArray(keys)) {
            fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: keys.length }));
            return;
          }
          throw new Error('Payload must be an array of keys');
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ONLINE', time: new Date().toISOString() }));
    return;
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: Prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for clean routes /calculator or /operator
      if (pathname === '/calculator') {
        filePath = path.join(__dirname, 'index.html');
      } else if (pathname === '/operator') {
        filePath = path.join(__dirname, 'operator.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎮 GAMER QUANTUM CALCULATOR & OPERATOR COMMAND HUB`);
  console.log(`======================================================`);
  console.log(`► Calculator URL:     http://localhost:${PORT}/`);
  console.log(`► Operator Hub URL:   http://localhost:${PORT}/operator.html`);
  console.log(`► Default Operator Passcode: OPERATOR`);
  console.log(`======================================================\n`);
});
