const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function handleApiRequest(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    let payload = {};
    if (body) {
      try {
        payload = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
        return;
      }
    }

    const respond = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const url = req.url;
    const method = req.method;

    if (url === '/api/register' && method === 'POST') {
      const { username, password } = payload;
      if (!username || !password) {
        return respond(400, { success: false, error: 'Username and password are required' });
      }
      try {
        const success = db.registerUser(username, password);
        if (success) {
          return respond(200, { success: true, message: 'User registered successfully' });
        } else {
          return respond(400, { success: false, error: 'Username already exists' });
        }
      } catch (err) {
        return respond(500, { success: false, error: 'Internal server error' });
      }
    }

    if (url === '/api/login' && method === 'POST') {
      const { username, password } = payload;
      if (!username || !password) {
        return respond(400, { success: false, error: 'Username and password are required' });
      }
      try {
        const user = db.authenticateUser(username, password);
        if (user) {
          const token = db.createSession(username);
          return respond(200, {
            success: true,
            token,
            username: user.username,
            playlist: user.playlist,
            settings: user.settings
          });
        } else {
          return respond(401, { success: false, error: 'Invalid username or password' });
        }
      } catch (err) {
        return respond(500, { success: false, error: 'Internal server error' });
      }
    }

    // Auth middleware check
    const authHeader = req.headers['authorization'];
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    const username = db.getUsernameBySession(token);

    if (!username) {
      return respond(401, { success: false, error: 'Unauthorized' });
    }

    if (url === '/api/sync' && method === 'POST') {
      const { playlist, settings } = payload;
      try {
        db.saveUserData(username, playlist, settings);
        return respond(200, { success: true, message: 'Data synced successfully' });
      } catch (err) {
        return respond(500, { success: false, error: 'Failed to sync data' });
      }
    }

    if (url === '/api/user/data' && method === 'GET') {
      try {
        const data = db.getUserData(username);
        return respond(200, {
          success: true,
          username,
          playlist: data.playlist,
          settings: data.settings
        });
      } catch (err) {
        return respond(500, { success: false, error: 'Failed to retrieve user data' });
      }
    }

    if (url === '/api/logout' && method === 'POST') {
      db.deleteSession(token);
      return respond(200, { success: true });
    }

    return respond(404, { success: false, error: 'API route not found' });
  });
}

const server = http.createServer((req, res) => {
  // Intercept API routes
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  // Decode URL to handle spaces and special chars
  const decodedUrl = decodeURIComponent(req.url);
  // Strip query parameters (e.g. ?v=4.0) to correctly resolve static files on disk
  const pathname = decodedUrl.split('?')[0];
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Prevent directory traversal attacks
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
      } else {
        res.statusCode = 500;
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Walkman Retro Player server is successfully running!`);
  console.log(`  Open your browser and navigate to:`);
  console.log(`  \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`=======================================================`);
});
