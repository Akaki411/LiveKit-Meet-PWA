FROM python:3.11-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends gcc g++ \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

COPY agent.py ./

ENV PYTHONPATH=/deps \
    HF_HOME=/root/.cache/huggingface \
    TORCH_HOME=/root/.cache/torch
RUN mkdir -p "$HF_HOME" "$TORCH_HOME" \
  && python -m livekit.agents download-files

FROM python:3.11-slim

RUN adduser --disabled-password --gecos "" --home /app --shell /sbin/nologin appuser

WORKDIR /app
COPY --from=build --chown=appuser:appuser /deps /usr/local/lib/python3.11/site-packages
COPY --from=build --chown=appuser:appuser /root/.cache /app/.cache
COPY --from=build --chown=appuser:appuser /app/agent.py ./

ENV PYTHONUNBUFFERED=1 \
    HOME=/app

USER appuser

CMD ["python", "agent.py", "start"]
