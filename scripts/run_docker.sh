#!/bin/bash

# Build the frontend
npm run build

# Run the Python scripts in sequence
python rebuild_cell_db_512.py
python embed-image-vectors.py

# Run the services in the background
python register-sam-service.py &
python register-similarity-search-service.py &

# Wait for background processes to finish
wait