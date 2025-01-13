#!/bin/bash

# Build the frontend
npm run build --prefix src/frontend

# Run backend
export PYTHONPATH=$(pwd)
python src/backend/main.py --workspace_name "agent-lens"