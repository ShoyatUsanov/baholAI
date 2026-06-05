# baholAI — single-service image: build the React frontend, then serve it
# together with the FastAPI backend from one origin (one URL for the demo).

# ---- Stage 1: build the frontend ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend + built frontend ----
FROM python:3.11-slim
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /fe/dist ./static

# Serve the built frontend, auto-seed demo data, use the rule-based grader
# (no Ollama on the server). Cloud platforms inject $PORT.
ENV STATIC_DIR=./static \
    AUTO_SEED=true \
    AI_ENABLED=false \
    PYTHONUNBUFFERED=1

EXPOSE 8002
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8002}"]
