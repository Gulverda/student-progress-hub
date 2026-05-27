FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p models

CMD python train.py && uvicorn main:app --host 0.0.0.0 --port 7860