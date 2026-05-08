FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

ENV MDE_SIDECAR_INTERNAL_PORT=5280

EXPOSE 5280

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${MDE_SIDECAR_INTERNAL_PORT:-5280}"]
