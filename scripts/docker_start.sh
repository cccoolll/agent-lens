#!/bin/bash

# Create necessary directories and set permissions
mkdir -p /app/.cache /app/src/frontend/tiles_output
chmod 777 /app/.cache /app/src/frontend/tiles_output

# Run setup and application scripts
sh scripts/setup_dev.sh
sh scripts/run_app.sh