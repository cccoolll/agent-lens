#!/bin/bash

# Build the frontend
cd src/frontend
npm run build
cd ../..

# Run backend
export PYTHONPATH=$(pwd)
python src/backend/rebuild_cell_db_512.py
python src/backend/embed-image-vectors.py --image_folder src/frontend/tiles_output --datatype squid
python src/backend/main.py