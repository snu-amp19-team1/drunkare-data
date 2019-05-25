#!/bin/bash

set -m

# protoc
python -m grpc_tools.protoc -I./protos --python_out=. --grpc_python_out=. protos/prediction_service.proto

# wait for Redis up-time
sleep 5;

# Run backend service in the background
python backend.py &

# Run ingress service in the foreground
python ingress.py
