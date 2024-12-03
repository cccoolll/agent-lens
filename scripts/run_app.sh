#!/bin/bash

# Build the frontend
cd src/frontend
npm run build
cd ../..

# Run backend
export PYTHONPATH=$(pwd)
python src/backend/main.py