const http = require('http');
const fs = require('fs');
const path = require('path');

// Constants
const PUBLIC_DIR = path.join(__dirname, 'src'); // Updated to serve files from the "src" directory
const PORT = 8080;

// Define the request handler
const requestHandler = (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

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

// Create the serv
