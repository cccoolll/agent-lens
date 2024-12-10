#!/bin/bash
cleanup() {
    echo "Terminating background Python process..."
    kill $PYTHON_PID
}

npm run build --prefix src/frontend

trap cleanup SIGINT
export PYTHONPATH=$(pwd)
python src/backend/start_server.py &
PYTHON_PID=$!

# npm run start --prefix src/frontend # TODO: make this work

wait $PYTHON_PID