#!/bin/bash
cleanup() {
    echo "Terminating background Python process..."
    kill $PYTHON_PID
}

docker-compose up -f docker/docker-compose.yml -d minio
trap cleanup SIGINT
export PYTHONPATH=$(pwd)
python agent_lens/__main__.py &
PYTHON_PID=$!

npm run start --prefix frontend

wait $PYTHON_PID