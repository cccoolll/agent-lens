#!/bin/bash
cleanup() {
    echo "Terminating background Python process..."
    kill $PYTHON_PID
}

trap cleanup SIGINT
export PYTHONPATH=$(pwd)
python src/backend/main.py &
PYTHON_PID=$!

npm run start --prefix src/frontend

wait $PYTHON_PID