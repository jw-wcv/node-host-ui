const http = require('http');
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

// Constants
const PUBLIC_DIR = path.join(__dirname, 'dist'); // Points to the dist directory
const PORT = 8080;

// Define the request handler
const requestHandler = (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Handle API endpoint for configuring the node
  if (req.method === 'POST' && req.url === '/configure-node') {
    let body = '';

    // Collect the POST data
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { ipv6, privateKey, gitRepo } = JSON.parse(body);

        if (!ipv6 || !privateKey || !gitRepo) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        const conn = new Client();

        conn
          .on('ready', () => {
            console.log('SSH Connection established.');
            conn.exec(
              `git clone ${gitRepo} && cd $(basename ${gitRepo} .git) && chmod +x bootstrap.sh && ./bootstrap.sh`,
              (err, stream) => {
                if (err) {
                  console.error('SSH Command error:', err);
                  conn.end();
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Command execution failed' }));
                  return;
                }

                stream
                  .on('close', (code, signal) => {
                    console.log(`Command finished with code ${code} and signal ${signal}`);
                    conn.end();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Node configured successfully' }));
                  })
                  .stderr.on('data', (data) => {
                    console.error('STDERR:', data.toString());
                  });
              }
            );
          })
          .on('error', (err) => {
            console.error('SSH Connection error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'SSH connection failed' }));
          })
          .connect({
            host: ipv6,
            username: 'root',
            privateKey: privateKey,
          });
      } catch (error) {
        console.error('Error parsing request body:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to process request' }));
      }
    });

    return;
  }

  // Serve static files for other requests
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  // Map file extension to MIME type
  const mimeType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
  }[ext] || 'application/octet-stream';

  // Check if file exists and serve it
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error(`Error serving file ${filePath}:`, err);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    }
  });
};

// Create the server
const server = http.createServer(requestHandler);

// Start the server on port 8080
server.listen(PORT, '::', () => {
  console.log(`Server is running on port ${PORT} and accessible via IPv6`);
});
