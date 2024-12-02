#!/bin/bash

# Build the frontend
cd src/frontend
npm run build
cd ../..

# Run the Python scripts in sequence
python src/backend/rebuild_cell_db_512.py
python src/backend/embed-image-vectors.py --image_folder src/frontend/tiles_output --datatype squid

# Run the services in the background
python src/backend/register-sam-service.py &
python src/backend/register-similarity-search-service.py &
python src/backend/register-frontend-service.py &

# Wait for background processes to finish
wait