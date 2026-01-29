#!/bin/bash
set -e

# Read Backend URL from workspace file (created by previous Cloud Build step)
# Cloud Build mounts the workspace volume at /workspace
if [ -f /workspace/backend_url.txt ]; then
    export VITE_API_URL=$(cat /workspace/backend_url.txt)
else
    echo "Warning: /workspace/backend_url.txt not found."
fi

if [ -z "$VITE_API_URL" ]; then
    echo "Error: Backend URL is empty"
    exit 1
fi

echo "Building Frontend with VITE_API_URL: $VITE_API_URL"
npm run build
