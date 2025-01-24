#!/bin/bash
cleanup() {
    echo "Terminating background Python process..."
    kill $PYTHON_PID
}

docker-compose up -f docker/docker-compose.yml -d minio
npm run build --prefix frontend

trap cleanup SIGINT
export PYTHONPATH=$(pwd)
python agent_lens/__main__.py &
PYTHON_PID=$!

echo "App is now running. Access it at http://localhost:8080/public/apps/microscope-control"

wait $PYTHON_PID