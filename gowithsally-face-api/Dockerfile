##############################################################################
# GoWithSally - Face AI Studio v4.0 - Dockerfile
# Multi-stage build with development and production targets
# BUILD:   docker build -t gowithsally/face-api .
# BUILD DEV: docker build -t gowithsally/face-api:dev --target development .
# RUN:     docker run -p 8000:8000 --env-file .env gowithsally/face-api
##############################################################################

# ─── Base Dependencies ──────────────────────────────────────────────────────
FROM python:3.11-slim AS base

LABEL maintainer="GoWithSally <dev@gowithsally.com>"
LABEL description="Face AI Studio - Detection, Recognition, Gender, Age"
LABEL version="4.0.0"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    libopenblas-dev liblapack-dev libgomp1 \
    libsndfile1-dev libsndfile1 \
    libffi-dev \
    curl wget dumb-init \
    libxcb1 libx11-6 libxext6 libxrender1 \
    libglib2.0-0 libgl1 libsm6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONDONTWRITEBYTECODE=1

# ─── Development Stage ──────────────────────────────────────────────────────
FROM base AS development

ENV APP_ENV=development \
    LOG_LEVEL=debug \
    WORKERS=1

# Install pip tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch CPU-only
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy application code
COPY app/ ./app/
COPY templates/ ./templates/
COPY static/ ./static/

# Create model directories
RUN mkdir -p models/face models/gender models/antispoof models/age \
    models/voice_gender models/facecount models/headcount models/recognition

# Try to download models (continue on failure)
RUN python -c "\
import urllib.request, bz2, os; \
os.makedirs('models/face', exist_ok=True); \
print('Downloading landmarks (95 MB)...'); \
try: \
    urllib.request.urlretrieve('http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2', '/tmp/lm.bz2'); \
    open('models/face/shape_predictor_68_face_landmarks.dat','wb').write(bz2.open('/tmp/lm.bz2','rb').read()); \
    os.remove('/tmp/lm.bz2'); \
    print('Downloaded landmarks'); \
except: print('Landmarks download failed - will retry at runtime'); \
print('Downloading recognition (21 MB)...'); \
try: \
    urllib.request.urlretrieve('http://dlib.net/files/dlib_face_recognition_resnet_model_v1.dat.bz2', '/tmp/rec.bz2'); \
    open('models/face/dlib_face_recognition_resnet_model_v1.dat','wb').write(bz2.open('/tmp/rec.bz2','rb').read()); \
    os.remove('/tmp/rec.bz2'); \
    print('Downloaded recognition'); \
except: print('Recognition download failed - will retry at runtime'); \
" || true

EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health/ping || exit 1

CMD ["dumb-init", "gunicorn", "app.main:app", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "1", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "debug"]

# ─── Testing Stage ──────────────────────────────────────────────────────────
FROM base AS testing

ENV APP_ENV=testing \
    LOG_LEVEL=warn \
    WORKERS=1

# Install pip tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel pytest pytest-cov

# Install PyTorch CPU-only
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# Install dependencies including test deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy application code
COPY app/ ./app/
COPY templates/ ./templates/
COPY static/ ./static/
COPY tests/ ./tests/

# Create model directories
RUN mkdir -p models/face models/gender models/antispoof models/age \
    models/voice_gender models/facecount models/headcount models/recognition

EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=15s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health/ping || exit 1

CMD ["dumb-init", "pytest", "-v", "tests/"]

# ─── Production Stage ───────────────────────────────────────────────────────
FROM base AS production

ENV APP_ENV=production \
    LOG_LEVEL=info \
    WORKERS=2

# Install pip tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch CPU-only
RUN pip install --no-cache-dir \
    torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# Install dependencies (production only)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip cache purge || true

# Copy application code
COPY app/ ./app/
COPY templates/ ./templates/
COPY static/ ./static/

# Create model directories
RUN mkdir -p models/face models/gender models/antispoof models/age \
    models/voice_gender models/facecount models/headcount models/recognition

# Download models at build time
RUN python -c "\
import urllib.request, bz2, os; \
os.makedirs('models/face', exist_ok=True); \
print('Downloading landmarks (95 MB)...'); \
try: \
    urllib.request.urlretrieve('http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2', '/tmp/lm.bz2'); \
    open('models/face/shape_predictor_68_face_landmarks.dat','wb').write(bz2.open('/tmp/lm.bz2','rb').read()); \
    os.remove('/tmp/lm.bz2'); \
    print('Downloaded landmarks'); \
except Exception as e: print(f'Landmarks download failed: {e}'); \
print('Downloading recognition (21 MB)...'); \
try: \
    urllib.request.urlretrieve('http://dlib.net/files/dlib_face_recognition_resnet_model_v1.dat.bz2', '/tmp/rec.bz2'); \
    open('models/face/dlib_face_recognition_resnet_model_v1.dat','wb').write(bz2.open('/tmp/rec.bz2','rb').read()); \
    os.remove('/tmp/rec.bz2'); \
    print('Downloaded recognition'); \
except Exception as e: print(f'Recognition download failed: {e}'); \
" || true

# Create non-root user
RUN useradd -m -u 1000 faceapi && \
    chown -R faceapi:faceapi /app

USER faceapi

EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health/ping || exit 1

# Run with gunicorn + uvicorn workers
CMD ["dumb-init", "gunicorn", "app.main:app", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
