from concurrent import futures
import time
import logging

import grpc
import redis
import json

import prediction_service_pb2
import prediction_service_pb2_grpc

def generateKey(username: str,
                id: int,
                valueType: str):
    return '{}-{}-{}'.format(username, id, valueType)


class PredictionServicer(prediction_service_pb2_grpc.PredictionServicer):

    def __init__(self):
        self.redis = redis.Redis(
            host='redis',
            port=6379)

    def GetActivityInference(self, request, context):
        key = generateKey(request.username,
                          request.id,
                          'raw')

        print('key: {}', key)

        # HACK:
        #   Formatting json string
        raw = '{{"accel":{{"x":{},"y":{},"z":{}}},"gyro":{{"x":{},"y":{},"z":{}}}}}'.format(request.accel.x,
                                                                                            request.accel.y,
                                                                                            request.accel.z,
                                                                                            request.gyro.x,
                                                                                            request.gyro.y,
                                                                                            request.gyro.z)

        self.redis.set(key, json.dumps(raw))
        value = self.redis.get(key)

        # HACK:
        #  https://stackoverflow.com/questions/22600128
        #  https://stackoverflow.com/questions/14820429
        #  
        pyValue = json.loads(value.decode('unicode-escape').strip('"'))

        for k, v in pyValue.items():
            # pyValue['x']
            print('{}'.format(k))
            for kk, vv in v.items():
                print('{}: {}'.format(kk, vv))

        return prediction_service_pb2.ActivityResponse(
            status=prediction_service_pb2.ActivityResponse.ERR
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    prediction_service_pb2_grpc.add_PredictionServicer_to_server(
        PredictionServicer(), server)
    server.add_insecure_port('[::]:5051')
    server.start()
    try:
        while True:
            time.sleep(1000)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    logging.basicConfig()
    serve()
