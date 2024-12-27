const http = require('http');
const fs = require('fs');
const path = require('path');

// Constants
const PUBLIC_DIR = path.join(__dirname);
const PORT = 8080;

// Define the request handler
const requestHandler = (req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.method === 'GET' && req.url === '/') {
    // Serve the `index.html` file for the root route
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        console.error('Error serving HTML file:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
};

// Create the server
const server = http.createServer(requestHandler);

// Start the server on port 8080
server.listen(PORT, '::', () => {
  console.log(`Server is running on port ${PORT} and accessible via IPv6`);
});
