from __future__ import print_function

import logging
import json

import grpc

import prediction_service_pb2
import prediction_service_pb2_grpc

import redis
from aiohttp import web

def get_activity_inference(stub):
    """
    Send activity reference request via GRPC
    """
    rawdata = prediction_service_pb2.RawData(
        username='alice',
        id=1000,
        nrSamples=4,
        accel = prediction_service_pb2.RawData.Record(
            sensorType = prediction_service_pb2.RawData.Record.ACCEL,
            x = [0,0,0,0],
            y = [0,0,0,0],
            z = [0,0,0,0]),
        gyro = prediction_service_pb2.RawData.Record(
            sensorType = prediction_service_pb2.RawData.Record.GYRO,
            x = [0,0,0,0],
            y = [0,0,0,0],
            z = [0,0,0,0]))
    responses = stub.GetActivityInference(rawdata)
    print('status: {}'.format(responses.status))

async def handle(request):
    """
    (1) Parse raw data (2) Increment per-username id and (3) Send grpc request
    """
    username = request.match_info.get('username', "None")
    data = await request.json()
    print('{}'.format(json.dumps(data)))
    # text = "Hello, " + name
    with grpc.insecure_channel('localhost:5051') as channel:
        stub = prediction_service_pb2_grpc.PredictionStub(channel)
        get_activity_inference(stub)

    return web.Response(text='Hello')

async def index(request):
    return web.Response(text=r'''
<!doctype html>
<html>
  <head>
    <title>Test</title>
  </head>
  <body>
    <input class="inference" type="button" value="Get recent activities">
    <div class="logger"></div>
    <script>
    const inference = document.querySelector('.inference');
    const logger = document.querySelector('.logger');

    inference.addEventListener('click', function() {
      fetch('/api')
        .then(resp => resp.json())
        .then(data => {
           const log = document.createElement('p');
           log.textContent = JSON.stringify(data);
           logger.appendChild(log);
        })
    });
    </script>
  </body>
</html>''', content_type='text/html')

async def api(request):
    return web.Response(text=r'''{"x":0,"y":1}''', content_type='application/json')

def run():

    with grpc.insecure_channel('localhost:5051') as channel:
        stub = prediction_service_pb2_grpc.PredictionStub(channel)
        get_activity_inference(stub)

    app = web.Application()
    app.add_routes([web.post('/{username}', handle),
                    web.get('/', index),
                    web.get('/api', api)])
    web.run_app(app, port=8888)

if __name__ == '__main__':
    logging.basicConfig()
    run()
