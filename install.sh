#!/bin/bash

# Define the repository URL and target directory
REPO_URL="https://github.com/jw-wcv/node-host-ui.git"
TARGET_DIR="$HOME/node-host-ui"

# Navigate to the parent directory
cd ..

# Check if the target directory exists and delete it
if [ -d "$TARGET_DIR" ]; then
    echo "Removing existing directory: $TARGET_DIR"
    rm -rf "$TARGET_DIR"
else
    echo "No existing directory to remove."
fi

# Clone the repository
echo "Cloning repository: $REPO_URL"
git clone "$REPO_URL" "$TARGET_DIR"

# Navigate to the newly cloned directory
cd "$TARGET_DIR" || {
    echo "Failed to navigate to directory: $TARGET_DIR"
    exit 1
}

# Make the bootstrap script executable
echo "Setting executable permissions on bootstrap.sh"
chmod +x bootstrap.sh

# Run the bootstrap script with sudo
echo "Running bootstrap.sh"
sudo ./bootstrap.sh

echo "Reinstallation complete!"

