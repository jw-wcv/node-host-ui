#!/bin/bash

# Ensure the script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root. Use sudo." >&2
  exit 1
fi

# Update package lists
apt update -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_current.x | bash -
apt install -y nodejs

# Install PM2 globally using npm
npm install -g pm2

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)

if [ -z "$node_version" ] || [ -z "$npm_version" ]; then
  echo "Node.js installation failed. Please check the logs." >&2
  exit 1
fi

# Output versions
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Start the server using PM2
echo "Starting the server using PM2..."
pm2 start server.js --name wallet-connect-server

# Configure PM2 to start on reboot
pm2 startup
pm2 save

echo "Setup complete. The server is running and managed by PM2."
