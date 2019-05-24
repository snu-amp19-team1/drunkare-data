from __future__ import print_function

import logging
import json

import grpc

import prediction_service_pb2
import prediction_service_pb2_grpc

import redis
from aiohttp import web

def new_data(stub):
    """
    Send activity reference request via GRPC
    """

    # TODO: Replace with real data
    rawdata = prediction_service_pb2.RawData(
        username='alice',
        id=1000,
        nrSamples=4,
        record=prediction_service_pb2.RawData.Record(
            sensorType=prediction_service_pb2.RawData.Record.ACCEL,
            x = [0,0,0,0],
            y = [0,0,0,0],
            z = [0,0,0,0]))
    responses = stub.NewData(rawdata)
    print('new_data: {}'.format(responses))


def infer_activity(stub):
    activity_request = prediction_service_pb2.ActivityRequest(
        username='alice',
        id=1000,
        nrRequests=1)
    responses = stub.InferActivity(activity_request)
    print('infer_activity: {}'.format(responses))
    return responses.activities


async def username(request):
    """
    (1) Parse raw data (2) Increment per-username id and (3) Send grpc request
    """
    username = request.match_info.get('username', "None")
    data = await request.json()
    print('{}'.format(json.dumps(data)))
    # text = "Hello, " + name
    with grpc.insecure_channel('localhost:5051') as channel:
        stub = prediction_service_pb2_grpc.PredictionStub(channel)
        new_data(stub)

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
    <input class="flushdb" type="button" value="Flush db">
    <input class="keys" type="button" value="Get all keys">
    <div class="logger"></div>
    <script>
    const inference = document.querySelector('.inference');
    const flushDb = document.querySelector('.flushdb');
    const keys = document.querySelector('.keys');
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

    flushDb.addEventListener('click', function() {
      fetch('/flush')
        .then(resp => resp.json())
        .then(data => {
           const log = document.createElement('p');
           log.textContent = data.text;
           logger.appendChild(log);
        })
    });

    keys.addEventListener('click', function() {
      fetch('/keys')
        .then(resp => resp.json())
        .then(data => {
           const log = document.createElement('p');
           log.textContent = `Extracting all keys: ${data.keys}`;
           logger.appendChild(log);
        })
    })
    </script>
  </body>
</html>''', content_type='text/html')


async def api(request):
    activities = []

    with grpc.insecure_channel('localhost:5051') as channel:
        stub = prediction_service_pb2_grpc.PredictionStub(channel)
        activities = infer_activity(stub)

    return web.Response(text='{}'.format(activities), content_type='application/json')


async def flush(request):
    r = redis.Redis(
        host='redis',
        port=6379)

    r.flushdb()

    return web.Response(text='{"text":"Flush Redis"}', content_type='application/json')


async def keys(request):
    r = redis.Redis(
        host='redis',
        port=6379)

    keys = []
    for key in r.keys():
        keys.append(key.decode('utf-8'))

    message = {}
    message['keys'] = keys

    return web.Response(text=json.dumps(message), content_type='application/json')


def run():

    with grpc.insecure_channel('localhost:5051') as channel:
        stub = prediction_service_pb2_grpc.PredictionStub(channel)
        new_data(stub)

    app = web.Application()
    app.add_routes([web.post('/{username}', username),
                    web.get('/', index),
                    web.get('/api', api),
                    web.get('/flush', flush),
                    web.get('/keys', keys)])
    web.run_app(app, port=8888)


if __name__ == '__main__':
    logging.basicConfig()
    run()
