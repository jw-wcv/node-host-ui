#!/bin/bash

# Ensure the script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root. Use sudo." >&2
  exit 1
fi

# Update package lists
echo "Updating package lists..."
apt update -y

# Install prerequisites
echo "Installing prerequisites..."
apt install -y curl gnupg apt-transport-https lsof

# Add Node.js repository and install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_current.x | bash -
apt install -y nodejs

# Install PM2 globally using npm
echo "Installing PM2 globally..."
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

# Terminate any processes running on port 8080
PORT=8080
echo "Checking for existing processes on port $PORT..."
EXISTING_PID=$(lsof -t -i:$PORT)
if [ -n "$EXISTING_PID" ]; then
  echo "Found processes running on port $PORT. Terminating..."
  kill -9 $EXISTING_PID
  echo "Terminated processes on port $PORT."
else
  echo "No processes running on port $PORT."
fi

# Stop and delete any existing PM2 process for the server
PM2_APP_NAME="aleph-node-app"
echo "Stopping existing PM2 processes for '$PM2_APP_NAME'..."
pm2 delete "$PM2_APP_NAME" 2>/dev/null || echo "No existing PM2 process found for '$PM2_APP_NAME'."

# Change directory to the project root
PROJECT_DIR="$(dirname "$(realpath "$0")")"
cd "$PROJECT_DIR" || { echo "Failed to change directory to $PROJECT_DIR. Exiting."; exit 1; }

# Install project dependencies
if [ -f "package.json" ]; then
  echo "Installing project dependencies..."
  npm install || { echo "Failed to install dependencies. Exiting."; exit 1; }
else
  echo "package.json not found in $PROJECT_DIR. Skipping dependency installation."
fi

# Start the Node.js server using PM2
echo "Starting the Node.js server using PM2..."
pm2 start server.js --name "$PM2_APP_NAME" || { echo "Failed to start server using PM2. Exiting."; exit 1; }

# Configure PM2 to start on system reboot
echo "Configuring PM2 to restart the server on system reboot..."
pm2 startup -u "$(whoami)" --hp "$HOME"
pm2 save || { echo "Failed to configure PM2 for auto-restart. Exiting."; exit 1; }

echo "Setup complete. The Node.js server is running and managed by PM2."
