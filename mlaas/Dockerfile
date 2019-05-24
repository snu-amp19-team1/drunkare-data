FROM python:3.7-slim

ENV GRPC_PYTHON_VERSION 1.19.0
RUN python -m pip install --upgrade pip

ADD . /app
WORKDIR /app

RUN pip install -r requirements.txt
EXPOSE 8888

CMD ./init_script.sh
