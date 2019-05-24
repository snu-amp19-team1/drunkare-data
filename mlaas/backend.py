from concurrent import futures
import time
import logging
import struct

import grpc
import redis
import json

import prediction_service_pb2
import prediction_service_pb2_grpc

def generate_key(username: str,
                 id: int,
                 sensorType: int,
                 valueType: str):
    return '{}-{:04d}-{:02d}-{}'.format(username, id, sensorType, valueType)


class PredictionServicer(prediction_service_pb2_grpc.PredictionServicer):

    def __init__(self):
        self.redis = redis.Redis(
            host='redis',
            port=6379)

    def NewData(self, request, context):
        user_idx = self.redis.get(request.username)
        if user_idx == None:
            self.redis.set(request.username, struct.pack('<L', 0))
        else:
            user_idx = struct.unpack('<L', user_idx)[0]

            if request.id > user_idx:
                # New request
                self.redis.set(request.username, struct.pack('<L', request.id))

        # For debugging
        user_idx = self.redis.get(request.username)
        user_idx = struct.unpack('<L', user_idx)[0]
        print('username: {}, idx: {}'.format(request.username, user_idx))

        key = generate_key(request.username,
                           request.id,
                           request.record.sensorType,
                           'raw')

        nrSamples = request.nrSamples

        print('key: {}'.format(key))
        raw = '{{"x":{},"y":{},"z":{}}}'.format(request.record.x, request.record.y, request.record.z)

        self.redis.set(key, json.dumps(raw))
        value = self.redis.get(key)

        # HACK:
        #  https://stackoverflow.com/questions/22600128
        #  https://stackoverflow.com/questions/14820429
        #  
        pyValue = json.loads(value.decode('unicode-escape').strip('"'))

        for k, v in pyValue.items():
            print('{}: {}'.format(k, v))

        ###############################################################
        # TODO: Compute and store features                            #
        ###############################################################

        # Fake response for now
        return prediction_service_pb2.DataAck(
            status=prediction_service_pb2.DataAck.OK,
            nrSamples=nrSamples
        )

    def InferActivity(self, request, context):
        username = request.username
        from_id = request.id
        nrRequests = request.nrRequests
 
        # dummy
        a_key = generate_key(username, from_id, 0, 'raw')
        g_key = generate_key(username, from_id, 1, 'raw')
        a_value = self.redis.get(a_key)
        g_value = self.redis.get(g_key)

        # Just check
        print('{} {}'.format(a_value, g_value))

        return prediction_service_pb2.ActivityResponse(
            status=prediction_service_pb2.ActivityResponse.OK,
            nrRequests=nrRequests,
            activities=[1, 1, 1, 1])

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
