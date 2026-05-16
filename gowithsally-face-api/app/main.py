"""
GoWithSally Face AI Studio - FastAPI Backend v4.1
=================================================
13 models: detection, landmarks, recognition (dlib+TF), gender (Pth+TF),
anti-spoof (Pth+TF), voice gender, age, face count (YOLO), head count (YOLO)

v4.1 fixes:
  - Background model loading (server starts immediately)
  - Better error handling & logging
  - Diagnostic /api/test endpoint (no auth)
  - Graceful handling of missing dependencies
"""

import os, io, time, json, uuid, hashlib, tempfile, logging, threading
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional, List
from datetime import datetime

import numpy as np
import cv2
import dlib
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("face-api")

# ==============================================================================
# CONFIGURATION
# ==============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

# Auth
PASSWORD = os.getenv("APP_PASSWORD", "sally2024")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
API_KEYS = {}

# Pipeline thresholds
CONF_HIGH = float(os.getenv("CONF_HIGH", "85.0"))
CONF_LOW = float(os.getenv("CONF_LOW", "60.0"))
MATCH_STRICT = float(os.getenv("MATCH_STRICT", "0.45"))
MATCH_NORMAL = float(os.getenv("MATCH_NORMAL", "0.55"))

# AI API keys (external fallback providers)
AI_KEYS = {
    "gemini": os.getenv("GEMINI_API_KEY", ""),
    "openai": os.getenv("OPENAI_API_KEY", ""),
    "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
    "grok": os.getenv("GROK_API_KEY", ""),
    "mistral": os.getenv("MISTRAL_API_KEY", ""),
    "deepseek": os.getenv("DEEPSEEK_API_KEY", ""),
    "kimi": os.getenv("KIMI_API_KEY", ""),
}

# Environment
APP_ENV = os.getenv("APP_ENV", "development")

# ==============================================================================
# MODEL PATHS
# ==============================================================================
DLIB_LANDMARKS_PATH = MODELS_DIR / "face" / "shape_predictor_68_face_landmarks.dat"
DLIB_RECOG_PATH = MODELS_DIR / "face" / "dlib_face_recognition_resnet_model_v1.dat"

GENDER_PTH_PATH = MODELS_DIR / "gender" / "gender_model_v3.pth"
GENDER_TF_PATH = MODELS_DIR / "gender" / "gender_model_v3.h5"

ANTISPOOF_PTH_PATH = MODELS_DIR / "antispoof" / "antispoof_model_v3.pth"
ANTISPOOF_TF_PATH = MODELS_DIR / "antispoof" / "antispoof_model_v4.h5"

VOICE_GENDER_DIR = MODELS_DIR / "voice_gender"
VOICE_MODEL_PATH = VOICE_GENDER_DIR / "best_model.pkl"
VOICE_SCALER_PATH = VOICE_GENDER_DIR / "scaler.pkl"
VOICE_LABEL_ENC_PATH = VOICE_GENDER_DIR / "label_encoder.pkl"
VOICE_VAR_SEL_PATH = VOICE_GENDER_DIR / "var_selector.pkl"
VOICE_MI_SEL_PATH = VOICE_GENDER_DIR / "mi_selector.pkl"
VOICE_META_PATH = VOICE_GENDER_DIR / "model_metadata.json"

AGE_KERAS_V3_PATH = MODELS_DIR / "age" / "age_model_v3.keras"   # 27MB - fast to load
AGE_KERAS_V4_PATH = MODELS_DIR / "age" / "age_model_v4.keras"   # 270MB - slow
AGE_TFLITE_V4_PATH = MODELS_DIR / "age" / "age_model_v4.tflite"  # ~30MB - converted from v4
AGE_TFLITE_V4_Q_PATH = MODELS_DIR / "age" / "age_model_v4_int8.tflite"  # ~10MB - quantized

FACECOUNT_YOLO_PATH = MODELS_DIR / "facecount" / "yolo_face_best.pt"
HEADCOUNT_YOLO_PATH = MODELS_DIR / "headcount" / "yolo_head_best.pt"
HEADCOUNT_YOLO_ALT = MODELS_DIR / "headcount" / "yolo_head" / "weights" / "best.pt"

# ==============================================================================
# GLOBAL MODEL STORE
# ==============================================================================
models = {}
_loading_status = {"done": False, "phase": "starting", "errors": []}


# ==============================================================================
# AUTO-REBUILD MODEL HEADS FROM STATE_DICT
# ==============================================================================
def _rebuild_sequential_head(state_dict, prefix, default_in_features):
    """
    Reconstruct a nn.Sequential head from checkpoint keys.
    Handles custom FC / classifier heads that differ from default torchvision models.
    """
    import torch.nn as nn

    params_by_idx = {}
    for k, v in state_dict.items():
        if not k.startswith(prefix + "."):
            continue
        parts = k.split(".")
        if len(parts) < 3:
            continue
        try:
            idx = int(parts[1])
        except ValueError:
            continue
        attr = parts[2]
        if idx not in params_by_idx:
            params_by_idx[idx] = {}
        params_by_idx[idx][attr] = v

    if not params_by_idx:
        return nn.Linear(default_in_features, 2)

    max_idx = max(params_by_idx.keys())
    layers = []

    for i in range(max_idx + 1):
        if i in params_by_idx:
            p = params_by_idx[i]
            if "running_mean" in p:
                num_features = p["weight"].shape[0]
                layers.append(nn.BatchNorm1d(num_features))
            elif "weight" in p and p["weight"].dim() == 2:
                out_f, in_f = p["weight"].shape
                layers.append(nn.Linear(in_f, out_f))
            elif "weight" in p and p["weight"].dim() == 1:
                num_features = p["weight"].shape[0]
                layers.append(nn.BatchNorm1d(num_features))
        else:
            prev_type = None
            for j in range(i - 1, -1, -1):
                if j in params_by_idx:
                    prev_type = "bn" if "running_mean" in params_by_idx[j] else "linear"
                    break
            if prev_type == "bn":
                layers.append(nn.Dropout(0.3))
            else:
                layers.append(nn.ReLU())

    logger.info(f"  Rebuilt {prefix}: {' -> '.join(type(l).__name__ for l in layers)}")
    return nn.Sequential(*layers)


# ==============================================================================
# MODEL LOADING FUNCTIONS
# ==============================================================================
def _load_dlib_models():
    """Load dlib models (fast, essential). Called synchronously."""
    # Face Detector
    try:
        models["detector"] = dlib.get_frontal_face_detector()
        logger.info("[OK] Face detector (dlib HOG)")
    except Exception as e:
        logger.error(f"[FAIL] Face detector: {e}")

    # 68 Landmarks
    try:
        if DLIB_LANDMARKS_PATH.exists():
            models["landmarks"] = dlib.shape_predictor(str(DLIB_LANDMARKS_PATH))
            logger.info("[OK] 68 landmarks predictor")
        else:
            logger.warning(f"[SKIP] Landmarks not found: {DLIB_LANDMARKS_PATH}")
    except Exception as e:
        logger.error(f"[FAIL] Landmarks: {e}")

    # Recognition (dlib)
    try:
        if DLIB_RECOG_PATH.exists():
            models["recog_dlib"] = dlib.face_recognition_model_v1(str(DLIB_RECOG_PATH))
            logger.info("[OK] Recognition (dlib 128D)")
        else:
            logger.warning(f"[SKIP] Recognition model not found")
    except Exception as e:
        logger.error(f"[FAIL] Recognition: {e}")


def _load_pytorch_models():
    """Load PyTorch models (medium speed)."""
    try:
        import torch
        import torch.nn as nn
        from torchvision import models as tv_models
    except ImportError:
        logger.warning("[SKIP] PyTorch not installed - skipping Gender & AntiSpoof PyTorch models")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Gender (PyTorch)
    _loading_status["phase"] = "Loading Gender model..."
    try:
        if GENDER_PTH_PATH.exists():
            state = torch.load(str(GENDER_PTH_PATH), map_location=device, weights_only=True)
            if "model_state_dict" in state:
                state = state["model_state_dict"]

            net = tv_models.resnet18(weights=None)
            fc_keys = [k for k in state.keys() if k.startswith("fc.")]
            if any(k.startswith("fc.0.") for k in fc_keys):
                net.fc = _rebuild_sequential_head(state, "fc", net.fc.in_features)
                logger.info("  Gender: detected custom Sequential fc head")
            else:
                num_classes = state["fc.weight"].shape[0] if "fc.weight" in state else 2
                net.fc = nn.Linear(net.fc.in_features, num_classes)

            net.load_state_dict(state)
            net.to(device).eval()
            models["gender_pth"] = {"model": net, "device": device}
            logger.info("[OK] Gender (PyTorch ResNet18)")
        else:
            logger.warning(f"[SKIP] Gender PyTorch not found: {GENDER_PTH_PATH}")
    except Exception as e:
        logger.error(f"[FAIL] Gender PyTorch: {e}")
        _loading_status["errors"].append(f"Gender PyTorch: {e}")

    # Anti-Spoof (PyTorch)
    _loading_status["phase"] = "Loading AntiSpoof model..."
    try:
        if ANTISPOOF_PTH_PATH.exists():
            state = torch.load(str(ANTISPOOF_PTH_PATH), map_location=device, weights_only=True)
            if "model_state_dict" in state:
                state = state["model_state_dict"]

            net = tv_models.mobilenet_v2(weights=None)
            cls_keys = [k for k in state.keys() if k.startswith("classifier.")]
            max_cls_idx = max(int(k.split(".")[1]) for k in cls_keys) if cls_keys else 1
            if max_cls_idx > 1:
                net.classifier = _rebuild_sequential_head(state, "classifier", 1280)
                logger.info("  AntiSpoof: detected custom Sequential classifier head")
            else:
                num_classes = state.get("classifier.1.weight", state.get("classifier.weight", None))
                if num_classes is not None:
                    net.classifier[1] = nn.Linear(net.classifier[1].in_features, num_classes.shape[0])
                else:
                    net.classifier[1] = nn.Linear(net.classifier[1].in_features, 2)

            net.load_state_dict(state)
            net.to(device).eval()
            models["antispoof_pth"] = {"model": net, "device": device}
            logger.info("[OK] Anti-Spoof (PyTorch MobileNetV2)")
        else:
            logger.warning(f"[SKIP] Anti-Spoof PyTorch not found")
    except Exception as e:
        logger.error(f"[FAIL] Anti-Spoof PyTorch: {e}")
        _loading_status["errors"].append(f"Anti-Spoof PyTorch: {e}")


def _load_heavy_models():
    """Load TF and YOLO models (slow, runs in background thread)."""
    try:
        _load_heavy_models_inner()
    except Exception as e:
        logger.error(f"[CRITICAL] Background model loader crashed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        _loading_status["done"] = True
        _loading_status["phase"] = "error"
        _loading_status["errors"].append(f"Loader crash: {e}")

def _load_heavy_models_inner():
    """Inner function for heavy model loading with full error tracking."""

    # Voice Gender (sklearn)
    _loading_status["phase"] = "Loading Voice Gender model..."
    try:
        import joblib
        if VOICE_MODEL_PATH.exists():
            voice_data = {
                "model": joblib.load(str(VOICE_MODEL_PATH)),
                "scaler": joblib.load(str(VOICE_SCALER_PATH)) if VOICE_SCALER_PATH.exists() else None,
                "label_encoder": joblib.load(str(VOICE_LABEL_ENC_PATH)) if VOICE_LABEL_ENC_PATH.exists() else None,
                "var_selector": joblib.load(str(VOICE_VAR_SEL_PATH)) if VOICE_VAR_SEL_PATH.exists() else None,
                "mi_selector": joblib.load(str(VOICE_MI_SEL_PATH)) if VOICE_MI_SEL_PATH.exists() else None,
                "metadata": json.loads(VOICE_META_PATH.read_text()) if VOICE_META_PATH.exists() else {},
            }
            models["voice_gender"] = voice_data
            logger.info("[OK] Voice Gender (sklearn ensemble)")
        else:
            logger.warning(f"[SKIP] Voice Gender not found: {VOICE_MODEL_PATH}")
    except Exception as e:
        logger.error(f"[FAIL] Voice Gender: {e}")

    # TF models
    tf = None
    try:
        _loading_status["phase"] = "Importing TensorFlow..."
        import tensorflow as tf
        logger.info(f"[INFO] TensorFlow {tf.__version__} loaded")
    except ImportError:
        logger.warning("[SKIP] TensorFlow not installed - skipping TF models")
        tf = None

    if tf:
        # Helper: try multiple loading strategies for Keras 2/3 compatibility
        def _try_load_keras(path, name):
            """Try loading a Keras model with multiple strategies for Keras 2/3 compat."""
            strategies = [
                lambda p: tf.keras.models.load_model(str(p), compile=False),
                lambda p: tf.keras.models.load_model(str(p), compile=False, safe_mode=False),
            ]
            # For Keras 3, try with custom_objects to handle Keras 2 models
            try:
                import keras
                if hasattr(keras, '__version__') and keras.__version__.startswith('3'):
                    strategies.append(
                        lambda p: tf.keras.models.load_model(str(p), compile=False, safe_mode=False, custom_objects={})
                    )
            except: pass

            for i, strategy in enumerate(strategies):
                try:
                    model = strategy(path)
                    logger.info(f"[OK] {name} (strategy {i+1})")
                    return model
                except Exception as e:
                    if i == len(strategies) - 1:
                        logger.warning(f"[SKIP] {name}: {e}")
            return None

        # Recognition TF - ResNet50 + Dense(2048→512→256→128) face embedding
        try:
            recog_tf_path = MODELS_DIR / "recognition" / "face_recog_tf"
            recog_weights_path = MODELS_DIR / "face" / "face_recognition_model_v2.weights.h5"

            if recog_tf_path.exists():
                m = _try_load_keras(recog_tf_path, "Recognition TF (SavedModel)")
                if m: models["recog_tf"] = m
            elif recog_weights_path.exists():
                # Build ResNet50 architecture matching the weights file
                _loading_status["phase"] = "Building Recognition TF model..."
                try:
                    base = tf.keras.applications.ResNet50(
                        include_top=False, weights=None,
                        input_shape=(224, 224, 3), pooling='avg'
                    )
                    x = base.output  # (None, 2048)
                    x = tf.keras.layers.Dense(512, activation='relu')(x)
                    x = tf.keras.layers.BatchNormalization()(x)
                    x = tf.keras.layers.Dense(256, activation='relu')(x)
                    x = tf.keras.layers.BatchNormalization()(x)
                    x = tf.keras.layers.Dense(128)(x)
                    x = tf.keras.layers.Lambda(lambda t: tf.math.l2_normalize(t, axis=1), name='l2_normalize')(x)
                    model = tf.keras.Model(inputs=base.input, outputs=x)
                    model.load_weights(str(recog_weights_path))
                    models["recog_tf"] = model
                    logger.info("[OK] Recognition TF (ResNet50 + weights v2)")
                except Exception as e2:
                    # If weight loading fails (shape mismatch), try by_name
                    try:
                        model.load_weights(str(recog_weights_path), by_name=True, skip_mismatch=True)
                        models["recog_tf"] = model
                        logger.info("[OK] Recognition TF (ResNet50 + weights v2, partial)")
                    except Exception as e3:
                        logger.warning(f"[SKIP] Recognition TF weights: {e3}")
        except Exception as e:
            logger.info(f"[SKIP] Recognition TF: {e}")

        # Gender TF (optional)
        try:
            if GENDER_TF_PATH.exists():
                m = _try_load_keras(GENDER_TF_PATH, "Gender TF")
                if m: models["gender_tf"] = m
        except Exception as e:
            logger.info(f"[SKIP] Gender TF: {e}")

        # AntiSpoof TF (optional)
        try:
            if ANTISPOOF_TF_PATH.exists():
                m = _try_load_keras(ANTISPOOF_TF_PATH, "AntiSpoof TF")
                if m: models["antispoof_tf"] = m
        except Exception as e:
            logger.info(f"[SKIP] Anti-Spoof TF: {e}")

        # Age model — try TFLite first (fast ~2s), then Keras (slow ~5min)
        _loading_status["phase"] = "Loading Age model..."
        age_loaded = False

        # Strategy 1: TFLite (fastest, ~30MB, loads in 1-2s)
        for tflite_path, tflite_name in [
            (AGE_TFLITE_V4_Q_PATH, "Age TFLite v4 int8"),
            (AGE_TFLITE_V4_PATH, "Age TFLite v4 float32"),
        ]:
            if age_loaded: break
            if tflite_path.exists():
                try:
                    interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
                    interpreter.allocate_tensors()
                    models["age_tflite"] = interpreter
                    models["age_keras"] = "tflite"  # marker for age prediction code
                    logger.info(f"[OK] {tflite_name} ({tflite_path.stat().st_size / 1024 / 1024:.1f} MB)")
                    age_loaded = True
                except Exception as e:
                    logger.warning(f"[SKIP] {tflite_name}: {e}")

        # Strategy 2: Keras v3 (small, loads in ~5s)
        if not age_loaded and AGE_KERAS_V3_PATH.exists():
            try:
                m = tf.keras.models.load_model(str(AGE_KERAS_V3_PATH), compile=False)
                models["age_keras"] = m
                logger.info("[OK] Age Keras v3")
                age_loaded = True
            except Exception as e:
                logger.warning(f"[SKIP] Age Keras v3: {e}")

        # Strategy 3: Keras v4 with timeout (270MB, can take 5+ min)
        if not age_loaded and AGE_KERAS_V4_PATH.exists():
            import concurrent.futures
            def _load_age_v4():
                try:
                    return tf.keras.models.load_model(str(AGE_KERAS_V4_PATH), compile=False)
                except Exception as e:
                    logger.warning(f"[SKIP] Age Keras v4: {e}")
                    return None
            try:
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(_load_age_v4)
                    m = future.result(timeout=180)  # 3 min max
                    if m:
                        models["age_keras"] = m
                        logger.info("[OK] Age Keras v4 (270MB)")
                        age_loaded = True
            except concurrent.futures.TimeoutError:
                logger.warning("[SKIP] Age Keras v4: timeout (>180s)")
            except Exception as e:
                logger.warning(f"[SKIP] Age Keras v4: {e}")

        if not age_loaded:
            logger.warning("[SKIP] No Age model loaded")

        # Fallback: landmark-based age estimation (always available if detector + landmarks loaded)
        if "age_keras" not in models and "detector" in models and "landmarks" in models:
            models["age_landmarks_fallback"] = True
            logger.info("[OK] Age estimation fallback (dlib landmarks)")

    # YOLO models
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.warning("[SKIP] ultralytics not installed - skipping YOLO models")
        YOLO = None

    if YOLO:
        # Face Count
        _loading_status["phase"] = "Loading YOLO Face Count model..."
        try:
            if FACECOUNT_YOLO_PATH.exists():
                models["facecount_yolo"] = YOLO(str(FACECOUNT_YOLO_PATH))
                logger.info("[OK] Face Count (YOLOv8-Face)")
            else:
                logger.warning(f"[SKIP] Face Count YOLO not found: {FACECOUNT_YOLO_PATH}")
        except Exception as e:
            logger.error(f"[FAIL] Face Count YOLO: {e}")
            _loading_status["errors"].append(f"Face Count YOLO: {e}")

        # Head Detection
        _loading_status["phase"] = "Loading YOLO Head Detection model..."
        try:
            head_path = HEADCOUNT_YOLO_PATH if HEADCOUNT_YOLO_PATH.exists() else HEADCOUNT_YOLO_ALT
            if head_path.exists():
                models["headcount_yolo"] = YOLO(str(head_path))
                logger.info(f"[OK] Head Detection (YOLOv8-Head)")
            else:
                logger.warning(f"[SKIP] Head Detection YOLO not found")
        except Exception as e:
            logger.error(f"[FAIL] Head Detection YOLO: {e}")
            _loading_status["errors"].append(f"Head Detection YOLO: {e}")

    # Done
    _loading_status["done"] = True
    _loading_status["phase"] = "ready"
    loaded = sum(1 for v in models.values() if v is not None)
    logger.info("=" * 60)
    logger.info(f"ALL MODELS LOADED: {loaded} total")
    logger.info(f"AI API keys configured: {sum(1 for v in AI_KEYS.values() if v)}/{len(AI_KEYS)}")
    if _loading_status["errors"]:
        logger.warning(f"Errors during loading: {len(_loading_status['errors'])}")
        for err in _loading_status["errors"]:
            logger.warning(f"  - {err}")
    logger.info("=" * 60)


# ==============================================================================
# LIFESPAN - FAST START + BACKGROUND LOADING
# ==============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("GoWithSally Face AI Studio v4.2 - Starting...")
    logger.info(f"Environment: {APP_ENV}")
    logger.info("=" * 60)

    # Phase 1: Load essential dlib models synchronously (fast)
    _loading_status["phase"] = "Loading dlib models..."
    _load_dlib_models()

    # Phase 2: Load PyTorch models synchronously (medium)
    _loading_status["phase"] = "Loading PyTorch models..."
    _load_pytorch_models()

    # Count what we have so far
    fast_count = sum(1 for v in models.values() if v is not None)
    logger.info(f"Fast models loaded: {fast_count}")
    logger.info("Server starting... Heavy models loading in background.")

    # Phase 3: Load heavy models (TF/YOLO) in background thread
    bg_thread = threading.Thread(target=_load_heavy_models, daemon=True, name="model-loader")
    bg_thread.start()

    yield

    models.clear()
    _loading_status["done"] = False


# ==============================================================================
# APP INIT
# ==============================================================================
app = FastAPI(
    title="GoWithSally Face AI Studio",
    version="4.1.0",
    description="AI-powered face analysis API for ride-sharing safety",
    lifespan=lifespan,
)

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    if os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true":
        Instrumentator().instrument(app).expose(app)
        logger.info("[OK] Prometheus metrics on /metrics")
except ImportError:
    pass

templates_dir = BASE_DIR / "templates"
templates = Jinja2Templates(directory=str(templates_dir))


# ==============================================================================
# AUTH
# ==============================================================================
def verify_api_key(request: Request):
    key = request.headers.get("X-API-Key", "")
    if key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return API_KEYS[key]


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/studio", response_class=HTMLResponse)
async def studio(request: Request):
    return templates.TemplateResponse("studio.html", {"request": request})


@app.post("/api/auth/login")
async def login(password: str = Form(...)):
    if password != PASSWORD:
        raise HTTPException(status_code=401, detail="Wrong password")
    key = hashlib.sha256(f"{uuid.uuid4()}{time.time()}".encode()).hexdigest()[:48]
    API_KEYS[key] = {"created": time.time()}
    return {"api_key": key, "message": "OK", "version": "4.1"}


# ==============================================================================
# HELPERS
# ==============================================================================
def read_image(file_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Cannot decode image")
    return img


def detect_faces(img):
    detector = models.get("detector")
    if not detector:
        raise HTTPException(status_code=503, detail="Face detector not loaded")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return detector(gray, 1)


def get_landmarks(img, rect):
    predictor = models.get("landmarks")
    if not predictor:
        return None
    shape = predictor(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), rect)
    return [(shape.part(i).x, shape.part(i).y) for i in range(68)]


def get_embedding_for_rect(img, rect):
    predictor = models.get("landmarks")
    recog = models.get("recog_dlib")
    if not predictor or not recog:
        return None
    shape = predictor(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), rect)
    descriptor = recog.compute_face_descriptor(img, shape)
    return np.array(descriptor)


def crop_face(img, rect, margin=0.3):
    h, w = img.shape[:2]
    left, top, right, bottom = rect.left(), rect.top(), rect.right(), rect.bottom()
    fw, fh = right - left, bottom - top
    ml, mt = int(fw * margin), int(fh * margin)
    x1, y1 = max(0, left - ml), max(0, top - mt)
    x2, y2 = min(w, right + ml), min(h, bottom + mt)
    return img[y1:y2, x1:x2]


def predict_gender_pth(img, rect):
    import torch
    from torchvision import transforms

    gm = models.get("gender_pth")
    if not gm:
        return None
    face_crop = crop_face(img, rect, margin=0.3)
    if face_crop.size == 0:
        return None

    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
    tensor = transform(face_rgb).unsqueeze(0).to(gm["device"])

    with torch.no_grad():
        output = gm["model"](tensor)
        probs = torch.softmax(output, dim=1).cpu().numpy()[0]

    # Class 0 = Male, Class 1 = Female (standard training convention)
    gender = "male" if probs[0] > probs[1] else "female"
    confidence = float(max(probs)) * 100
    return {
        "gender": gender,
        "confidence": round(confidence, 1),
        "probabilities": {"male": round(float(probs[0]) * 100, 1), "female": round(float(probs[1]) * 100, 1)}
    }


def predict_antispoof_pth(img, rect):
    import torch
    from torchvision import transforms

    asm = models.get("antispoof_pth")
    if not asm:
        return None
    face_crop = crop_face(img, rect, margin=0.3)
    if face_crop.size == 0:
        return None

    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
    tensor = transform(face_rgb).unsqueeze(0).to(asm["device"])

    with torch.no_grad():
        output = asm["model"](tensor)
        probs = torch.softmax(output, dim=1).cpu().numpy()[0]

    is_real = probs[0] > probs[1]
    return {
        "is_real": bool(is_real),
        "confidence": round(float(max(probs)) * 100, 1),
        "pytorch_score": round(float(probs[0]), 4)
    }


def predict_antispoof_tf(img, rect):
    try:
        tf_model = models.get("antispoof_tf")
        if not tf_model:
            return None
        face_crop = crop_face(img, rect, margin=0.3)
        face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        face_resized = cv2.resize(face_rgb, (224, 224)).astype(np.float32) / 255.0
        pred = tf_model.predict(np.expand_dims(face_resized, 0), verbose=0)
        score = float(pred[0][0])
        return {"tensorflow_score": round(score, 4), "is_real": score > 0.5}
    except:
        return None


# --- VOICE GENDER HELPERS ---
def scipy_skew(x):
    try:
        from scipy.stats import skew
        return skew(x)
    except:
        return 0


def scipy_kurtosis(x):
    try:
        from scipy.stats import kurtosis
        return kurtosis(x)
    except:
        return 0


def _vg_preprocess_audio(y, sr):
    """VAD + vocal isolation + pre-emphasis + normalization (from predict_gender_v6)."""
    from scipy.signal import butter, filtfilt
    import librosa
    try:
        nyq = sr / 2
        low = 80 / nyq
        high = min(4000 / nyq, 0.99)
        b, a = butter(4, [low, high], btype='band')
        y_vocal = filtfilt(b, a, y)
    except Exception:
        y_vocal = y
    y_trimmed, _ = librosa.effects.trim(y_vocal, top_db=25)
    if len(y_trimmed) < sr * 0.3:
        y_trimmed = y_vocal
    y_emph = np.append(y_trimmed[0], y_trimmed[1:] - 0.97 * y_trimmed[:-1])
    max_val = np.max(np.abs(y_emph))
    if max_val > 0:
        y_emph = y_emph / max_val * 0.95
    return y_emph, y_trimmed


def _vg_extract_formants(y, sr, n_formants=4):
    """LPC-based formant extraction (from predict_gender_v6)."""
    try:
        order = int(2 + sr / 1000)
        windowed = y * np.hamming(len(y))
        autocorr = np.correlate(windowed, windowed, mode='full')
        autocorr = autocorr[len(autocorr) // 2:]
        r = autocorr[:order + 1]
        a = np.zeros(order + 1)
        a[0] = 1.0
        e = r[0]
        for i in range(1, order + 1):
            lam = 0
            for j in range(1, i):
                lam -= a[j] * r[i - j]
            lam = (r[i] + lam) / (e + 1e-10)
            a_new = a.copy()
            for j in range(1, i):
                a_new[j] = a[j] + lam * a[i - j]
            a_new[i] = lam
            a = a_new
            e = e * (1 - lam * lam)
        roots = np.roots(a)
        roots = roots[np.imag(roots) >= 0]
        angles = np.arctan2(np.imag(roots), np.real(roots))
        freqs = sorted(angles * (sr / (2 * np.pi)))
        freqs = [f for f in freqs if 90 < f < sr / 2]
        formants = {}
        for i in range(min(n_formants, len(freqs))):
            formants[f"formant_f{i + 1}"] = freqs[i]
        for i in range(n_formants):
            if f"formant_f{i + 1}" not in formants:
                formants[f"formant_f{i + 1}"] = 0.0
        return formants
    except Exception:
        return {f"formant_f{i + 1}": 0.0 for i in range(n_formants)}


def _extract_voice_features(audio_path):
    """Extract 148 audio features for voice gender classification (V6 pipeline)."""
    import librosa
    from scipy import stats as scipy_stats

    y_raw, sr = librosa.load(audio_path, sr=22050, duration=10.0)
    if len(y_raw) < sr * 0.3:
        raise ValueError("Audio too short (<0.3s)")
    y, y_trimmed = _vg_preprocess_audio(y_raw, sr)
    if len(y) < sr * 0.3:
        raise ValueError("Audio too short after preprocessing")

    f = {}

    # MFCC (13 x 4 stats = 52)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=2048, hop_length=512)
    for i in range(13):
        vals = mfcc[i]
        f[f"mfcc_{i}_mean"] = float(np.mean(vals))
        f[f"mfcc_{i}_std"] = float(np.std(vals))
        f[f"mfcc_{i}_skew"] = float(scipy_stats.skew(vals))
        f[f"mfcc_{i}_kurt"] = float(scipy_stats.kurtosis(vals))

    # Delta + Delta-Delta MFCC (26)
    delta = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)
    for i in range(13):
        f[f"mfcc_delta_{i}_mean"] = float(np.mean(delta[i]))
        f[f"mfcc_delta2_{i}_mean"] = float(np.mean(delta2[i]))

    # Chroma (12)
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    for i in range(12):
        f[f"chroma_{i}_mean"] = float(np.mean(chroma[i]))

    # Spectral features
    spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    f["spectral_centroid_mean"] = float(np.mean(spec_cent))
    f["spectral_centroid_std"] = float(np.std(spec_cent))
    spec_bw = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    f["spectral_bandwidth_mean"] = float(np.mean(spec_bw))
    f["spectral_bandwidth_std"] = float(np.std(spec_bw))
    spec_ro = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
    f["spectral_rolloff_mean"] = float(np.mean(spec_ro))
    f["spectral_rolloff_std"] = float(np.std(spec_ro))
    spec_ro25 = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.25)[0]
    f["spectral_rolloff_25_mean"] = float(np.mean(spec_ro25))
    sc = librosa.feature.spectral_contrast(y=y, sr=sr)
    for i in range(7):
        f[f"spectral_contrast_{i}_mean"] = float(np.mean(sc[i]))
    sf_vals = librosa.feature.spectral_flatness(y=y)[0]
    f["spectral_flatness_mean"] = float(np.mean(sf_vals))
    f["spectral_flatness_std"] = float(np.std(sf_vals))

    # ZCR + RMS
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    f["zcr_mean"] = float(np.mean(zcr))
    f["zcr_std"] = float(np.std(zcr))
    f["zcr_skew"] = float(scipy_stats.skew(zcr))
    rms = librosa.feature.rms(y=y)[0]
    f["rms_mean"] = float(np.mean(rms))
    f["rms_std"] = float(np.std(rms))
    f["rms_skew"] = float(scipy_stats.skew(rms))

    # Pitch / F0
    f0, _, _ = librosa.pyin(y_trimmed, fmin=librosa.note_to_hz("C2"),
                             fmax=librosa.note_to_hz("C7"), sr=sr)
    f0v = f0[~np.isnan(f0)]
    if len(f0v) > 5:
        f["pitch_mean"] = float(np.mean(f0v))
        f["pitch_std"] = float(np.std(f0v))
        f["pitch_min"] = float(np.min(f0v))
        f["pitch_max"] = float(np.max(f0v))
        f["pitch_range"] = float(np.max(f0v) - np.min(f0v))
        f["pitch_median"] = float(np.median(f0v))
        f["pitch_q25"] = float(np.percentile(f0v, 25))
        f["pitch_q75"] = float(np.percentile(f0v, 75))
        f["pitch_iqr"] = f["pitch_q75"] - f["pitch_q25"]
        f["pitch_skew"] = float(scipy_stats.skew(f0v))
        f["pitch_kurt"] = float(scipy_stats.kurtosis(f0v))
        f["pitch_cv"] = float(np.std(f0v) / (np.mean(f0v) + 1e-10))
    else:
        for k in ["pitch_mean", "pitch_std", "pitch_min", "pitch_max",
                   "pitch_range", "pitch_median", "pitch_q25", "pitch_q75",
                   "pitch_iqr", "pitch_skew", "pitch_kurt", "pitch_cv"]:
            f[k] = 0.0
    f["voiced_ratio"] = float(np.sum(~np.isnan(f0)) / max(len(f0), 1))

    # Formants
    voiced_indices = np.where(~np.isnan(f0))[0] if len(f0) > 0 else []
    if len(voiced_indices) > 0:
        hop = 512
        frame_len = 2048
        mid_idx = voiced_indices[len(voiced_indices) // 2]
        start_sample = mid_idx * hop
        end_sample = start_sample + frame_len
        if end_sample <= len(y_trimmed):
            segment = y_trimmed[start_sample:end_sample]
            formants = _vg_extract_formants(segment, sr)
        else:
            formants = _vg_extract_formants(y_trimmed[:min(frame_len, len(y_trimmed))], sr)
    else:
        formants = {f"formant_f{i + 1}": 0.0 for i in range(4)}
    f.update(formants)

    # Tonnetz (6)
    tonnetz = librosa.feature.tonnetz(y=y, sr=sr)
    for i in range(6):
        f[f"tonnetz_{i}_mean"] = float(np.mean(tonnetz[i]))

    # Harmonics
    harmonic, percussive = librosa.effects.hpss(y)
    h_mean = float(np.mean(np.abs(harmonic)))
    p_mean = float(np.mean(np.abs(percussive)))
    f["harmonic_mean"] = h_mean
    f["percussive_mean"] = p_mean
    f["harmonic_ratio"] = float(h_mean / (p_mean + 1e-10))
    f["harmonic_std"] = float(np.std(np.abs(harmonic)))
    f["hnr_approx"] = float(10 * np.log10(h_mean / (p_mean + 1e-10) + 1e-10))

    # Tempo
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    f["tempo"] = float(np.atleast_1d(tempo)[0])

    # Energy
    rms_norm = rms / (np.sum(rms) + 1e-10)
    f["energy_entropy"] = float(-np.sum(rms_norm * np.log2(rms_norm + 1e-10)))
    f["energy_range"] = float(np.max(rms) - np.min(rms))
    f["energy_std_norm"] = float(np.std(rms) / (np.mean(rms) + 1e-10))

    # Duration & speech rate
    f["duration"] = float(len(y_trimmed) / sr)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
    f["speech_rate"] = float(len(onsets) / (len(y) / sr + 1e-10))

    # Jitter & Shimmer
    if len(f0v) > 2:
        f["jitter"] = float(np.mean(np.abs(np.diff(f0v))) / (np.mean(f0v) + 1e-10))
    else:
        f["jitter"] = 0.0
    if len(rms) > 2:
        f["shimmer"] = float(np.mean(np.abs(np.diff(rms))) / (np.mean(rms) + 1e-10))
    else:
        f["shimmer"] = 0.0

    return f


def _predict_voice_gender_single(audio_path):
    """Single prediction using V6 model pipeline."""
    vg = models.get("voice_gender")
    if not vg:
        raise HTTPException(status_code=503, detail="Voice gender model not loaded")

    meta = vg["metadata"]
    feats = _extract_voice_features(audio_path)

    # Build feature vector using ALL features (before selection) - same order as training
    all_cols = meta.get("feature_columns_all", sorted(feats.keys()))
    X = np.array([[feats.get(c, 0.0) for c in all_cols]])
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    # Apply feature selection pipeline
    if vg["var_selector"] is not None:
        X = vg["var_selector"].transform(X)
    if vg["mi_selector"] is not None:
        X = vg["mi_selector"].transform(X)

    # Scale if needed
    if vg["scaler"] is not None and not meta.get("uses_pipeline", False):
        X = vg["scaler"].transform(X)

    model = vg["model"]
    pred = model.predict(X)[0]
    proba = model.predict_proba(X)[0] if hasattr(model, 'predict_proba') else None

    le = vg["label_encoder"]
    gender = le.inverse_transform([pred])[0] if le is not None else ("male" if pred == 1 else "female")
    conf = float(max(proba)) * 100 if proba is not None else 50.0

    probs = {}
    if proba is not None and le is not None:
        for i, cls in enumerate(le.classes_):
            probs[cls.lower()] = float(proba[i])

    return {"gender": gender.lower(), "confidence": round(conf, 1), "probabilities": probs}


def _predict_voice_gender_multi(audio_path):
    """Multi-segment analysis for long audio files (V6 pipeline)."""
    import librosa
    import soundfile as sf

    y_full, sr = librosa.load(audio_path, sr=22050, duration=30.0)
    duration = len(y_full) / sr

    if duration <= 4.0:
        return _predict_voice_gender_single(audio_path)

    # Long file: segment and vote
    seg_sec, overlap_sec = 3.0, 1.0
    step = int((seg_sec - overlap_sec) * sr)
    seg_len = int(seg_sec * sr)

    votes = {"male": 0.0, "female": 0.0}
    seg_votes = {"male": 0, "female": 0}
    n_segs = 0

    for start in range(0, len(y_full) - seg_len + 1, step):
        segment = y_full[start:start + seg_len]
        tmp_path = None
        try:
            fd, tmp_path = tempfile.mkstemp(suffix=".wav")
            os.close(fd)
            sf.write(tmp_path, segment, sr)
            result = _predict_voice_gender_single(tmp_path)
            g = result["gender"].lower()
            votes[g] = votes.get(g, 0) + result["confidence"]
            seg_votes[g] = seg_votes.get(g, 0) + 1
            n_segs += 1
        except Exception:
            pass
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass

    if n_segs == 0:
        return _predict_voice_gender_single(audio_path)

    total = sum(votes.values())
    gender = max(votes, key=votes.get)
    confidence = (votes[gender] / total * 100) if total > 0 else 50.0

    # Boost confidence based on vote unanimity
    vote_ratio = max(seg_votes.values()) / n_segs
    if vote_ratio >= 0.8:
        confidence = max(confidence, vote_ratio * 100)

    return {
        "gender": gender,
        "confidence": round(confidence, 1),
        "probabilities": {k: round(v / total, 4) if total > 0 else 0.5 for k, v in votes.items()},
        "n_segments": n_segs,
        "segment_votes": seg_votes,
    }


# --- AGE HELPERS ---
def _estimate_age_from_landmarks(img: np.ndarray):
    """
    Estimate age using dlib landmarks + face texture analysis.
    Primary signal: skin texture (wrinkles/smoothness) via Laplacian variance.
    Secondary: forehead and under-eye wrinkle density.
    Tertiary: face proportions (nose-to-face ratio, jaw width).
    Returns estimated age or None if no face detected.
    """
    if "detector" not in models or "landmarks" not in models:
        return None

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    faces = models["detector"](gray, 1)
    if not faces:
        return None

    face = faces[0]
    shape = models["landmarks"](gray, face)
    pts = np.array([(shape.part(i).x, shape.part(i).y) for i in range(68)], dtype=np.float32)

    h, w = gray.shape[:2]

    def _safe_roi(y1, y2, x1, x2):
        y1, y2 = max(0, int(y1)), min(h, int(y2))
        x1, x2 = max(0, int(x1)), min(w, int(x2))
        if y2 - y1 < 5 or x2 - x1 < 5:
            return None
        return gray[y1:y2, x1:x2]

    # === TEXTURE ANALYSIS (primary age signal) ===
    # Extract face ROI
    fx1, fy1 = int(face.left()), int(face.top())
    fx2, fy2 = int(face.right()), int(face.bottom())
    face_roi = _safe_roi(fy1, fy2, fx1, fx2)

    if face_roi is None:
        return None

    # Resize face to standard size for consistent texture measurement
    face_std = cv2.resize(face_roi, (200, 200))

    # 1) Overall face texture roughness (Laplacian variance)
    #    Smooth young skin: low variance (~50-200)
    #    Wrinkled older skin: high variance (~300-800+)
    lap = cv2.Laplacian(face_std, cv2.CV_64F)
    texture_var = lap.var()

    # 2) Forehead wrinkle density (between eyebrows and top of face)
    eyebrow_y = min(pts[19][1], pts[24][1])
    forehead_roi = _safe_roi(face.top(), eyebrow_y - 5,
                              pts[19][0], pts[24][0])
    forehead_wrinkle = 0.0
    if forehead_roi is not None:
        fh_std = cv2.resize(forehead_roi, (100, 40))
        # Horizontal edges = forehead wrinkles
        sobel_h = cv2.Sobel(fh_std, cv2.CV_64F, 0, 1, ksize=3)
        forehead_wrinkle = np.mean(np.abs(sobel_h))

    # 3) Under-eye wrinkle density (crow's feet region)
    left_eye_under = _safe_roi(pts[41][1], pts[41][1] + 15,
                                pts[36][0], pts[39][0])
    right_eye_under = _safe_roi(pts[47][1], pts[47][1] + 15,
                                 pts[42][0], pts[45][0])
    eye_wrinkle = 0.0
    for roi in [left_eye_under, right_eye_under]:
        if roi is not None and roi.size > 25:
            sobel = cv2.Sobel(roi, cv2.CV_64F, 1, 1, ksize=3)
            eye_wrinkle += np.mean(np.abs(sobel))
    eye_wrinkle /= 2.0

    # 4) Nasolabial fold depth (nose-to-mouth lines)
    nl_left = _safe_roi(pts[31][1], pts[48][1], pts[31][0] - 10, pts[31][0] + 10)
    nl_right = _safe_roi(pts[35][1], pts[54][1], pts[35][0] - 10, pts[35][0] + 10)
    nasolabial = 0.0
    for roi in [nl_left, nl_right]:
        if roi is not None and roi.size > 25:
            sobel = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
            nasolabial += np.mean(np.abs(sobel))
    nasolabial /= 2.0

    # === MAP TEXTURE TO AGE ===
    # texture_var typically ranges: 50-150 (child), 100-300 (young adult), 200-600 (middle), 400-1000+ (elderly)
    # But varies hugely with image quality, lighting, resolution, compression artifacts

    # Normalize texture variance to a 0-1 scale (sigmoid-like mapping)
    # Low quality / compressed images have higher base texture
    tex_score = min(1.0, max(0.0, (texture_var - 80) / 600.0))

    # Forehead wrinkles: 0-1 scale
    fh_score = min(1.0, max(0.0, (forehead_wrinkle - 5) / 30.0))

    # Eye wrinkles: 0-1 scale
    ew_score = min(1.0, max(0.0, (eye_wrinkle - 5) / 25.0))

    # Nasolabial: 0-1 scale
    nl_score = min(1.0, max(0.0, (nasolabial - 8) / 30.0))

    # Weighted combination
    age_score = (
        tex_score * 0.40 +    # Overall texture is strongest signal
        fh_score * 0.20 +     # Forehead wrinkles
        ew_score * 0.20 +     # Eye wrinkles
        nl_score * 0.20       # Nasolabial folds
    )

    # Map score (0-1) to age range (8-75)
    # Using a curve: young adults cluster around 0.15-0.35
    age = 8 + age_score * 67.0

    # Apply face proportion adjustments (secondary signals, small corrections)
    face_width = np.linalg.norm(pts[0] - pts[16])
    face_height = np.linalg.norm(pts[8] - pts[27])

    if face_width > 10 and face_height > 10:
        # Nose-to-face ratio increases slightly with age
        nose_len = np.linalg.norm(pts[27] - pts[33])
        nose_ratio = nose_len / face_height
        # Typical: 0.38 (young) to 0.48 (older)
        age += (nose_ratio - 0.42) * 15.0

        # Jaw sag ratio
        jaw_w = np.linalg.norm(pts[4] - pts[12])
        jaw_ratio = jaw_w / face_width
        age += (jaw_ratio - 0.82) * 10.0

    # Clamp
    age = max(5.0, min(80.0, age))

    return age


def _predict_age(file_bytes: bytes):
    img = read_image(file_bytes)

    face_detected = False
    try:
        faces = detect_faces(img)
        face_detected = len(faces) > 0
        if face_detected:
            face_img = crop_face(img, faces[0], margin=0.3)
            if face_img.size == 0:
                face_img = img
                face_detected = False
        else:
            face_img = img
    except Exception as e:
        logger.warning(f"Age: face detection failed ({e}), using full image")
        face_img = img

    face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
    face_resized = cv2.resize(face_rgb, (160, 160)).astype(np.float32)
    face_resized = (face_resized / 127.5) - 1.0
    input_tensor = np.expand_dims(face_resized, 0).astype(np.float32)

    # Try TFLite first (fastest)
    if "age_tflite" in models and models["age_tflite"] is not None:
        try:
            interpreter = models["age_tflite"]
            input_details = interpreter.get_input_details()
            output_details = interpreter.get_output_details()

            # Handle int8 quantized input
            if input_details[0]['dtype'] == np.uint8:
                input_data = ((face_resized + 1.0) * 127.5).astype(np.uint8)
                input_data = np.expand_dims(input_data, 0)
            else:
                input_data = input_tensor

            interpreter.set_tensor(input_details[0]['index'], input_data)
            interpreter.invoke()
            pred = interpreter.get_tensor(output_details[0]['index'])
            age = float(pred[0][0])
            # Model outputs 0-1 ratio, scale to 0-100
            if age <= 1.0:
                age = age * 100.0
            age = max(0.0, min(100.0, age))
            return {"age": round(age, 1), "face_detected": face_detected, "model": "tflite"}
        except Exception as e:
            logger.error(f"Age TFLite predict error: {e}")

    # Try Keras (slower but more accurate)
    if "age_keras" in models and models["age_keras"] is not None and models["age_keras"] != "tflite":
        try:
            pred = models["age_keras"].predict(input_tensor, verbose=0)
            age = float(pred[0][0])
            if age <= 1.0:
                age = age * 100.0
            age = max(0.0, min(100.0, age))
            return {"age": round(age, 1), "face_detected": face_detected, "model": "keras"}
        except Exception as e:
            logger.error(f"Age keras predict error: {e}")

    # Fallback: dlib landmark-based age estimation
    # Uses geometric ratios (eye-to-face ratio, mouth width, jawline curvature)
    # that correlate with age. Less accurate than deep learning but instant & reliable.
    try:
        age = _estimate_age_from_landmarks(img)
        if age is not None:
            return {"age": round(age, 1), "face_detected": True, "model": "landmarks"}
    except Exception as e:
        logger.error(f"Age landmark estimate error: {e}")

    raise HTTPException(status_code=503, detail="Age model not available. Please ensure age_model_v3.keras is valid.")


# --- YOLO HELPERS ---
def _count_faces_yolo(file_bytes: bytes, conf: float = 0.25):
    yolo = models.get("facecount_yolo")
    if not yolo:
        raise HTTPException(status_code=503, detail="Face count YOLO still loading or not available")
    img = read_image(file_bytes)
    results = yolo(img, conf=conf, verbose=False)
    boxes = []
    for r in results:
        for box in r.boxes:
            b = box.xyxy[0].cpu().numpy()
            boxes.append({"x1": float(b[0]), "y1": float(b[1]), "x2": float(b[2]), "y2": float(b[3]), "confidence": float(box.conf[0])})
    return {"count": len(boxes), "boxes": boxes, "model": "yolov8-face"}


def _detect_heads_yolo(file_bytes: bytes, conf: float = 0.25):
    yolo = models.get("headcount_yolo")
    if not yolo:
        raise HTTPException(status_code=503, detail="Head detection YOLO still loading or not available")
    img = read_image(file_bytes)
    results = yolo(img, conf=conf, verbose=False)
    boxes = []
    for r in results:
        for box in r.boxes:
            b = box.xyxy[0].cpu().numpy()
            boxes.append({"x1": float(b[0]), "y1": float(b[1]), "x2": float(b[2]), "y2": float(b[3]), "confidence": float(box.conf[0])})
    return {"count": len(boxes), "boxes": boxes, "model": "yolov8-head"}


# ==============================================================================
# API ENDPOINTS - HEALTH & DIAGNOSTICS
# ==============================================================================

@app.get("/api/health/ping")
async def health_ping():
    """No-auth health check for load balancers."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/test")
async def test_endpoint():
    """No-auth diagnostic endpoint. Use this to check if the server is running."""
    loaded = {k: (v is not None) for k, v in models.items()}
    return {
        "status": "ok",
        "version": "4.1",
        "server_running": True,
        "models_loading_done": _loading_status["done"],
        "loading_phase": _loading_status["phase"],
        "models_loaded": loaded,
        "models_count": sum(loaded.values()),
        "errors": _loading_status["errors"],
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/health")
async def health(user=Depends(verify_api_key)):
    model_keys = [
        "detector", "landmarks", "recog_dlib", "recog_tf",
        "gender_pth", "gender_tf", "antispoof_pth", "antispoof_tf",
        "voice_gender", "age_keras",
        "facecount_yolo", "headcount_yolo",
    ]
    model_status = {k: k in models and models[k] is not None for k in model_keys}
    # Show age fallback status
    model_status["age_landmarks_fallback"] = "detector" in models and "landmarks" in models
    ai_status = {k: bool(v) for k, v in AI_KEYS.items()}
    return {
        "status": "ok",
        "version": "4.2",
        "environment": APP_ENV,
        "models": model_status,
        "models_loaded": sum(model_status.values()),
        "models_total": len(model_status),
        "loading_done": _loading_status["done"],
        "loading_phase": _loading_status["phase"],
        "ai_providers": ai_status,
    }


# ==============================================================================
# API ENDPOINTS - CORE (8 features)
# ==============================================================================

@app.post("/api/detect")
async def api_detect(image: UploadFile = File(...), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    img = read_image(fb)
    faces = detect_faces(img)

    result_faces = []
    for rect in faces:
        face_data = {"box": {"left": rect.left(), "top": rect.top(), "right": rect.right(), "bottom": rect.bottom()}}
        landmarks = get_landmarks(img, rect)
        if landmarks:
            face_data["landmarks"] = landmarks
        result_faces.append(face_data)

    return {
        "faces_count": len(faces),
        "faces": result_faces,
        "image_size": {"width": img.shape[1], "height": img.shape[0]},
        "time_ms": round((time.time() - t0) * 1000, 1)
    }


@app.post("/api/recognize")
async def api_recognize(image: UploadFile = File(...), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    img = read_image(fb)
    faces = detect_faces(img)

    result_faces = []
    for rect in faces:
        emb = get_embedding_for_rect(img, rect)
        face_data = {"box": {"left": rect.left(), "top": rect.top(), "right": rect.right(), "bottom": rect.bottom()}}
        if emb is not None:
            face_data["embedding"] = emb.tolist()
            face_data["embedding_norm"] = float(np.linalg.norm(emb))
        result_faces.append(face_data)

    return {
        "faces_count": len(faces),
        "embedding_size": 128,
        "faces": result_faces,
        "time_ms": round((time.time() - t0) * 1000, 1)
    }


@app.post("/api/compare")
async def api_compare(image1: UploadFile = File(...), image2: UploadFile = File(...), threshold: float = Form(0.6), user=Depends(verify_api_key)):
    t0 = time.time()
    fb1, fb2 = await image1.read(), await image2.read()
    img1, img2 = read_image(fb1), read_image(fb2)
    faces1, faces2 = detect_faces(img1), detect_faces(img2)

    if len(faces1) == 0:
        raise HTTPException(status_code=400, detail="No face in image 1")
    if len(faces2) == 0:
        raise HTTPException(status_code=400, detail="No face in image 2")

    emb1 = get_embedding_for_rect(img1, faces1[0])
    emb2 = get_embedding_for_rect(img2, faces2[0])
    if emb1 is None or emb2 is None:
        raise HTTPException(status_code=503, detail="Recognition model not loaded")

    distance = float(np.linalg.norm(emb1 - emb2))
    cosine_sim = float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))
    is_same = distance < threshold
    confidence = round(max(0, min(100, (1 - distance / 1.2) * 100)), 1)

    return {
        "is_same_person": is_same,
        "distance": round(distance, 4),
        "cosine_similarity": round(cosine_sim, 4),
        "threshold": threshold,
        "confidence": confidence,
        "time_ms": round((time.time() - t0) * 1000, 1)
    }


@app.post("/api/gender")
async def api_gender(image: UploadFile = File(...), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    img = read_image(fb)
    faces = detect_faces(img)
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected")
    result = predict_gender_pth(img, faces[0])
    if result is None:
        raise HTTPException(status_code=503, detail="Gender model not loaded")
    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/antispoof")
async def api_antispoof(image: UploadFile = File(...), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    img = read_image(fb)
    faces = detect_faces(img)
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No face detected")

    pth_result = predict_antispoof_pth(img, faces[0])
    tf_result = predict_antispoof_tf(img, faces[0])

    result = {}
    if pth_result and tf_result:
        result["is_real"] = pth_result["is_real"] and tf_result["is_real"]
        result["confidence"] = round((pth_result["confidence"] + tf_result.get("confidence", pth_result["confidence"])) / 2, 1)
        result["pytorch_score"] = pth_result["pytorch_score"]
        result["tensorflow_score"] = tf_result["tensorflow_score"]
        result["cascade_method"] = "both_agree"
        result["verdict"] = "real" if result["is_real"] else "spoof"
    elif pth_result:
        result = pth_result
        result["verdict"] = "real" if result["is_real"] else "spoof"
        result["cascade_method"] = "pytorch_only"
    elif tf_result:
        result = tf_result
        result["verdict"] = "real" if result["is_real"] else "spoof"
        result["cascade_method"] = "tensorflow_only"
    else:
        raise HTTPException(status_code=503, detail="No anti-spoof model loaded")

    result["overall_confidence"] = result.get("confidence", 50)
    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/voice-gender")
async def api_voice_gender(audio: UploadFile = File(...), user=Depends(verify_api_key)):
    t0 = time.time()
    if "voice_gender" not in models:
        raise HTTPException(status_code=503, detail="Voice gender model not loaded. Check if model files exist in models/voice_gender/")

    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = _predict_voice_gender_multi(tmp_path)
        result["time_ms"] = round((time.time() - t0) * 1000, 1)
        return result
    finally:
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except OSError:
            pass  # Windows file lock - will be cleaned up by OS


@app.post("/api/age")
async def api_age(image: UploadFile = File(...), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    try:
        result = _predict_age(fb)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/api/age unhandled error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Age prediction failed: {str(e)}")
    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/count-faces")
async def api_count_faces(image: UploadFile = File(...), conf: float = Form(0.25), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    result = _count_faces_yolo(fb, conf)
    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/detect-heads")
async def api_detect_heads(image: UploadFile = File(...), conf: float = Form(0.25), user=Depends(verify_api_key)):
    t0 = time.time()
    fb = await image.read()
    result = _detect_heads_yolo(fb, conf)
    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/analyze")
async def api_analyze(image: UploadFile = File(...), user=Depends(verify_api_key)):
    """Full analysis: detection + gender + age + antispoof + face count + head count"""
    t0 = time.time()
    fb = await image.read()
    img = read_image(fb)
    result = {}

    # Detection
    faces = []
    try:
        faces = detect_faces(img)
        face_list = []
        for rect in faces:
            fd = {"box": {"left": rect.left(), "top": rect.top(), "right": rect.right(), "bottom": rect.bottom()}}
            lm = get_landmarks(img, rect)
            if lm:
                fd["landmarks_count"] = len(lm)
            face_list.append(fd)
        result["detection"] = {"faces_count": len(faces), "faces": face_list}
    except:
        result["detection"] = {"faces_count": 0, "error": "failed"}

    # Gender
    if len(faces) > 0:
        try:
            g = predict_gender_pth(img, faces[0])
            if g:
                result["gender"] = g
        except:
            pass

    # Age
    try:
        result["age"] = _predict_age(fb)
    except:
        result["age"] = {"age": None, "note": "Age model still loading"}

    # Anti-spoof
    if len(faces) > 0:
        try:
            pth_r = predict_antispoof_pth(img, faces[0])
            tf_r = predict_antispoof_tf(img, faces[0])
            if pth_r and tf_r:
                result["antispoof"] = {
                    "is_real": pth_r["is_real"] and tf_r["is_real"],
                    "confidence": round((pth_r["confidence"] + pth_r["confidence"]) / 2, 1),
                    "verdict": "real" if (pth_r["is_real"] and tf_r["is_real"]) else "spoof",
                }
            elif pth_r:
                result["antispoof"] = {**pth_r, "verdict": "real" if pth_r["is_real"] else "spoof"}
        except:
            pass

    # Face Count (YOLO)
    try:
        result["face_count"] = _count_faces_yolo(fb)
    except:
        result["face_count"] = {"count": None, "note": "YOLO still loading"}

    # Head Count (YOLO)
    try:
        result["head_count"] = _detect_heads_yolo(fb)
    except:
        result["head_count"] = {"count": None, "note": "YOLO still loading"}

    result["total_time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


# ==============================================================================
# API ENDPOINTS - GOWITHSALLY SPECIFIC
# ==============================================================================

@app.post("/api/driver-verify")
async def api_driver_verify(
    profile: UploadFile = File(...),
    selfie: UploadFile = File(...),
    user=Depends(verify_api_key)
):
    """Driver verification: compare profile photo with live selfie + anti-spoof + age check."""
    t0 = time.time()
    fb_profile = await profile.read()
    fb_selfie = await selfie.read()

    img_profile = read_image(fb_profile)
    img_selfie = read_image(fb_selfie)

    faces_p = detect_faces(img_profile)
    faces_s = detect_faces(img_selfie)

    if len(faces_p) == 0:
        raise HTTPException(status_code=400, detail="No face detected in profile photo")
    if len(faces_s) == 0:
        raise HTTPException(status_code=400, detail="No face detected in selfie")

    result = {"verified": False, "checks": {}}

    # 1. Face match
    emb_p = get_embedding_for_rect(img_profile, faces_p[0])
    emb_s = get_embedding_for_rect(img_selfie, faces_s[0])
    if emb_p is not None and emb_s is not None:
        distance = float(np.linalg.norm(emb_p - emb_s))
        is_match = distance < MATCH_STRICT
        confidence = round(max(0, min(100, (1 - distance / 1.2) * 100)), 1)
        result["checks"]["face_match"] = {
            "passed": is_match,
            "distance": round(distance, 4),
            "threshold": MATCH_STRICT,
            "confidence": confidence
        }
    else:
        result["checks"]["face_match"] = {"passed": False, "error": "Recognition model not loaded"}

    # 2. Liveness check
    spoof = predict_antispoof_pth(img_selfie, faces_s[0])
    if spoof:
        result["checks"]["liveness"] = {"passed": spoof["is_real"], "confidence": spoof["confidence"]}
    else:
        result["checks"]["liveness"] = {"passed": True, "note": "Anti-spoof model not loaded, skipped"}

    # 3. Gender
    gender = predict_gender_pth(img_selfie, faces_s[0])
    if gender:
        result["checks"]["gender"] = gender

    # 4. Age
    try:
        age_result = _predict_age(fb_selfie)
        is_eligible = age_result["age"] >= 18
        result["checks"]["age"] = {
            "age": age_result["age"],
            "is_driver_eligible": is_eligible,
            "model": age_result.get("model", "unknown")
        }
    except:
        result["checks"]["age"] = {"age": None, "is_driver_eligible": None, "note": "Age model not loaded"}

    # Overall verdict
    face_ok = result["checks"].get("face_match", {}).get("passed", False)
    live_ok = result["checks"].get("liveness", {}).get("passed", True)
    age_ok = result["checks"].get("age", {}).get("is_driver_eligible", True)
    result["verified"] = face_ok and live_ok and (age_ok is not False)
    result["time_ms"] = round((time.time() - t0) * 1000, 1)

    return result


@app.post("/api/passenger-verify")
async def api_passenger_verify(
    booking: UploadFile = File(...),
    live: UploadFile = File(...),
    user=Depends(verify_api_key)
):
    """Passenger verification: softer threshold + face count in vehicle."""
    t0 = time.time()
    fb_booking = await booking.read()
    fb_live = await live.read()

    img_booking = read_image(fb_booking)
    img_live = read_image(fb_live)

    faces_b = detect_faces(img_booking)
    faces_l = detect_faces(img_live)

    if len(faces_b) == 0:
        raise HTTPException(status_code=400, detail="No face in booking photo")
    if len(faces_l) == 0:
        raise HTTPException(status_code=400, detail="No face in live photo")

    result = {"verified": False, "checks": {}}

    # Face match (softer threshold)
    emb_b = get_embedding_for_rect(img_booking, faces_b[0])
    emb_l = get_embedding_for_rect(img_live, faces_l[0])
    if emb_b is not None and emb_l is not None:
        distance = float(np.linalg.norm(emb_b - emb_l))
        is_match = distance < MATCH_NORMAL
        confidence = round(max(0, min(100, (1 - distance / 1.2) * 100)), 1)
        result["checks"]["face_match"] = {
            "passed": is_match,
            "distance": round(distance, 4),
            "threshold": MATCH_NORMAL,
            "confidence": confidence
        }
    else:
        result["checks"]["face_match"] = {"passed": False, "error": "Recognition model not loaded"}

    # Head count in live image
    try:
        heads = _detect_heads_yolo(fb_live)
        result["checks"]["occupants"] = {"head_count": heads["count"], "model": heads["model"]}
    except:
        result["checks"]["occupants"] = {"head_count": None, "note": "Head detection not available yet"}

    result["verified"] = result["checks"].get("face_match", {}).get("passed", False)
    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/trip-safety")
async def api_trip_safety(
    image: UploadFile = File(...),
    user=Depends(verify_api_key)
):
    """Trip safety score: combines liveness + face count + head count into a safety rating."""
    t0 = time.time()
    fb = await image.read()
    img = read_image(fb)

    score = 100
    details = {}

    # Face detection
    faces = []
    try:
        faces = detect_faces(img)
        details["faces_detected"] = len(faces)
        if len(faces) == 0:
            score -= 30
            details["face_penalty"] = "No face detected (-30)"
    except:
        details["faces_detected"] = 0
        score -= 20

    # Liveness
    if len(faces) > 0:
        spoof = predict_antispoof_pth(img, faces[0])
        if spoof:
            details["liveness"] = {"is_real": spoof["is_real"], "confidence": spoof["confidence"]}
            if not spoof["is_real"]:
                score -= 40
                details["liveness_penalty"] = "Spoof detected (-40)"
        else:
            details["liveness"] = {"note": "Model not loaded"}

    # Head count
    try:
        heads = _detect_heads_yolo(fb)
        details["head_count"] = heads["count"]
        if heads["count"] > 5:
            score -= 15
            details["overcrowding_penalty"] = f"Too many occupants: {heads['count']} (-15)"
    except:
        details["head_count"] = None

    # Face count via YOLO
    try:
        yolo_faces = _count_faces_yolo(fb)
        details["yolo_face_count"] = yolo_faces["count"]
    except:
        details["yolo_face_count"] = None

    score = max(0, min(100, score))
    level = "high" if score >= 80 else ("medium" if score >= 50 else "low")

    return {
        "safety_score": score,
        "safety_level": level,
        "details": details,
        "time_ms": round((time.time() - t0) * 1000, 1)
    }


@app.get("/api/config/ai-providers")
async def api_ai_providers(user=Depends(verify_api_key)):
    """Show which AI API keys are configured."""
    return {
        "providers": {k: {"configured": bool(v), "key_preview": f"{v[:8]}..." if v and len(v) > 8 else ""} for k, v in AI_KEYS.items()}
    }


# ==============================================================================
# EXTERNAL AI FALLBACK SYSTEM
# ==============================================================================
# Priority: Internal models FIRST, external AI only when internal fails.
# Providers tried in order: Gemini > OpenAI > Anthropic > DeepSeek > Mistral
# ==============================================================================

import httpx
import base64

def _img_to_base64(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")


async def _call_gemini_vision(image_b64: str, prompt: str) -> dict:
    """Call Google Gemini Vision API."""
    key = AI_KEYS.get("gemini")
    if not key:
        raise ValueError("Gemini API key not configured")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}}
        ]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 500}
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"provider": "gemini", "raw": text}


async def _call_openai_vision(image_b64: str, prompt: str) -> dict:
    """Call OpenAI GPT-4 Vision API."""
    key = AI_KEYS.get("openai")
    if not key:
        raise ValueError("OpenAI API key not configured")
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
        ]}],
        "max_tokens": 500, "temperature": 0.1
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {key}"})
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return {"provider": "openai", "raw": text}


async def _call_anthropic_vision(image_b64: str, prompt: str) -> dict:
    """Call Anthropic Claude Vision API."""
    key = AI_KEYS.get("anthropic")
    if not key:
        raise ValueError("Anthropic API key not configured")
    url = "https://api.anthropic.com/v1/messages"
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 500,
        "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64}},
            {"type": "text", "text": prompt}
        ]}]
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers={
            "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"
        })
        resp.raise_for_status()
        data = resp.json()
        text = data["content"][0]["text"]
        return {"provider": "anthropic", "raw": text}


async def _call_deepseek_vision(image_b64: str, prompt: str) -> dict:
    """Call DeepSeek Vision API (OpenAI-compatible)."""
    key = AI_KEYS.get("deepseek")
    if not key:
        raise ValueError("DeepSeek API key not configured")
    url = "https://api.deepseek.com/v1/chat/completions"
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
        ]}],
        "max_tokens": 500, "temperature": 0.1
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {key}"})
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return {"provider": "deepseek", "raw": text}


async def _call_mistral_vision(image_b64: str, prompt: str) -> dict:
    """Call Mistral Vision API."""
    key = AI_KEYS.get("mistral")
    if not key:
        raise ValueError("Mistral API key not configured")
    url = "https://api.mistral.ai/v1/chat/completions"
    payload = {
        "model": "mistral-small-latest",
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
        ]}],
        "max_tokens": 500, "temperature": 0.1
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {key}"})
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return {"provider": "mistral", "raw": text}


async def _call_kimi_vision(image_b64: str, prompt: str) -> dict:
    """Call Kimi (Moonshot) Vision API."""
    key = AI_KEYS.get("kimi")
    if not key:
        raise ValueError("Kimi API key not configured")
    url = "https://api.moonshot.cn/v1/chat/completions"
    payload = {
        "model": "moonshot-v1-32k-vision-preview",
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
        ]}],
        "max_tokens": 500, "temperature": 0.1
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers={"Authorization": f"Bearer {key}"})
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        return {"provider": "kimi", "raw": text}


# Provider priority order for fallback
_VISION_PROVIDERS = [
    ("gemini", _call_gemini_vision),
    ("openai", _call_openai_vision),
    ("anthropic", _call_anthropic_vision),
    ("deepseek", _call_deepseek_vision),
    ("kimi", _call_kimi_vision),
    ("mistral", _call_mistral_vision),
]


async def _external_ai_vision(image_b64: str, prompt: str, preferred_provider: str = None) -> dict:
    """Try external AI providers in priority order. Returns first successful response."""
    providers = list(_VISION_PROVIDERS)
    # Move preferred provider to front if specified
    if preferred_provider:
        providers = sorted(providers, key=lambda p: 0 if p[0] == preferred_provider else 1)

    errors = []
    for name, func in providers:
        if not AI_KEYS.get(name):
            continue
        try:
            result = await func(image_b64, prompt)
            return result
        except Exception as e:
            errors.append(f"{name}: {str(e)[:100]}")
            continue

    raise HTTPException(status_code=503, detail=f"All AI providers failed: {'; '.join(errors)}")


def _parse_ai_json(raw_text: str) -> dict:
    """Extract JSON from AI response text (may contain markdown code blocks)."""
    import re
    # Try to find JSON in code blocks
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # Try parsing the whole text as JSON
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass
    # Try finding a JSON object in the text
    match = re.search(r'\{[^{}]*\}', raw_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {"raw_response": raw_text}


# ==============================================================================
# AI-POWERED ENDPOINTS (external fallback when internal models fail)
# ==============================================================================

@app.post("/api/ai/gender")
async def api_ai_gender(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """Gender detection with external AI fallback.
    PRIORITY: Internal model first, external AI only if internal fails."""
    t0 = time.time()
    fb = await image.read()

    # TRY INTERNAL FIRST
    try:
        img = read_image(fb)
        faces = detect_faces(img)
        if faces:
            result = predict_gender_pth(img, faces[0])
            if result:
                result["source"] = "internal"
                result["time_ms"] = round((time.time() - t0) * 1000, 1)
                return result
        raise Exception("No face or model not loaded")
    except Exception as e:
        logger.warning(f"Internal gender failed, trying external AI: {e}")

    # FALLBACK: External AI
    prompt = """Analyze this face image. Determine the person's gender.
Respond ONLY with JSON: {"gender": "male" or "female", "confidence": 0-100}"""
    b64 = _img_to_base64(fb)
    ai_result = await _external_ai_vision(b64, prompt, provider)
    parsed = _parse_ai_json(ai_result["raw"])
    parsed["source"] = f"external-{ai_result['provider']}"
    parsed["time_ms"] = round((time.time() - t0) * 1000, 1)
    return parsed


@app.post("/api/ai/age")
async def api_ai_age(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """Age estimation with external AI fallback.
    PRIORITY: Internal model first, external AI only if internal fails."""
    t0 = time.time()
    fb = await image.read()

    # TRY INTERNAL FIRST
    try:
        result = _predict_age(fb)
        result["source"] = "internal"
        result["time_ms"] = round((time.time() - t0) * 1000, 1)
        return result
    except Exception as e:
        logger.warning(f"Internal age failed, trying external AI: {e}")

    # FALLBACK: External AI
    prompt = """Analyze this face image. Estimate the person's age in years.
Respond ONLY with JSON: {"age": <number>, "age_range": "<min>-<max>", "confidence": 0-100}"""
    b64 = _img_to_base64(fb)
    ai_result = await _external_ai_vision(b64, prompt, provider)
    parsed = _parse_ai_json(ai_result["raw"])
    parsed["source"] = f"external-{ai_result['provider']}"
    parsed["time_ms"] = round((time.time() - t0) * 1000, 1)
    return parsed


@app.post("/api/ai/analyze")
async def api_ai_full_analyze(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """Full face analysis with external AI fallback.
    Runs internal models first, fills gaps with external AI."""
    t0 = time.time()
    fb = await image.read()
    result = {"source": "internal", "time_ms": 0}

    # Try internal models using existing functions
    try:
        img = read_image(fb)
        faces = detect_faces(img)
        if faces:
            rect = faces[0]
            # Gender
            try:
                g = predict_gender_pth(img, rect)
                if g: result["gender"] = g
                else: result["gender"] = {"error": "model not loaded"}
            except Exception as e:
                result["gender"] = {"error": str(e)}
            # Antispoof
            try:
                a = predict_antispoof_pth(img, rect)
                if a: result["antispoof"] = a
                else: result["antispoof"] = {"error": "model not loaded"}
            except Exception as e:
                result["antispoof"] = {"error": str(e)}
        else:
            result["gender"] = {"error": "no face detected"}
            result["antispoof"] = {"error": "no face detected"}
        # Age (uses file_bytes)
        try:
            result["age"] = _predict_age(fb)
        except Exception as e:
            result["age"] = {"error": str(e)}
    except Exception as e:
        result["gender"] = {"error": str(e)}
        result["age"] = {"error": str(e)}
        result["antispoof"] = {"error": str(e)}

    # If gender or age failed, try external AI for full analysis
    needs_external = any(
        isinstance(result.get(k), dict) and "error" in result.get(k, {}) for k in ["gender", "age"]
    )
    if needs_external and any(AI_KEYS.get(p) for p in ["gemini", "openai", "anthropic", "deepseek", "kimi", "mistral"]):
        try:
            prompt = """Analyze this face image. Provide:
- Gender (male/female) with confidence 0-100
- Estimated age in years with confidence 0-100
- Ethnicity estimate
- Facial expression/emotion
Respond ONLY with JSON: {"gender": "male/female", "gender_confidence": 0-100, "age": <number>, "age_confidence": 0-100, "ethnicity": "...", "emotion": "..."}"""
            b64 = _img_to_base64(fb)
            ai_result = await _external_ai_vision(b64, prompt, provider)
            parsed = _parse_ai_json(ai_result["raw"])
            # Fill in failed fields with AI results
            if "error" in result.get("gender", {}):
                result["gender"] = {"gender": parsed.get("gender", "unknown"),
                                     "confidence": parsed.get("gender_confidence", 50),
                                     "source": f"external-{ai_result['provider']}"}
            if "error" in result.get("age", {}):
                result["age"] = {"age": parsed.get("age", 0),
                                  "confidence": parsed.get("age_confidence", 50),
                                  "source": f"external-{ai_result['provider']}"}
            # Bonus fields from AI
            if parsed.get("ethnicity"):
                result["ethnicity"] = {"value": parsed["ethnicity"], "source": f"external-{ai_result['provider']}"}
            if parsed.get("emotion"):
                result["emotion"] = {"value": parsed["emotion"], "source": f"external-{ai_result['provider']}"}
        except Exception as e:
            logger.error(f"External AI full analysis failed: {e}")

    result["time_ms"] = round((time.time() - t0) * 1000, 1)
    return result


@app.post("/api/ai/describe")
async def api_ai_describe(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """AI-powered detailed face description (external AI only)."""
    t0 = time.time()
    fb = await image.read()
    prompt = """Describe this person's face in detail for identification purposes:
- Approximate age, gender, ethnicity
- Hair color, style, length
- Eye color and shape
- Face shape (oval, round, square, etc.)
- Notable features (beard, glasses, scars, piercings, etc.)
- Expression/emotion
- Clothing visible
Respond with JSON: {"age": <number>, "gender": "...", "ethnicity": "...", "hair": "...", "eyes": "...", "face_shape": "...", "features": ["..."], "expression": "...", "clothing": "...", "description": "one paragraph summary"}"""
    b64 = _img_to_base64(fb)
    ai_result = await _external_ai_vision(b64, prompt, provider)
    parsed = _parse_ai_json(ai_result["raw"])
    parsed["source"] = f"external-{ai_result['provider']}"
    parsed["time_ms"] = round((time.time() - t0) * 1000, 1)
    return parsed


@app.post("/api/ai/verify")
async def api_ai_verify(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """Deep verification: run internal + external AI and compare results."""
    t0 = time.time()
    fb = await image.read()
    results = {"internal": {}, "external": {}, "consensus": {}}

    # Internal models
    try:
        img = read_image(fb)
        faces = detect_faces(img)
        if faces:
            rect = faces[0]
            try:
                g = predict_gender_pth(img, rect)
                results["internal"]["gender"] = g or {"error": "model not loaded"}
            except Exception as e:
                results["internal"]["gender"] = {"error": str(e)}
            try:
                a = predict_antispoof_pth(img, rect)
                results["internal"]["antispoof"] = a or {"error": "model not loaded"}
            except Exception as e:
                results["internal"]["antispoof"] = {"error": str(e)}
        else:
            results["internal"]["gender"] = {"error": "no face"}
            results["internal"]["antispoof"] = {"error": "no face"}
        try:
            results["internal"]["age"] = _predict_age(fb)
        except Exception as e:
            results["internal"]["age"] = {"error": str(e)}
    except Exception as e:
        for k in ["gender", "age", "antispoof"]:
            results["internal"][k] = {"error": str(e)}

    # External AI
    prompt = """Analyze this face image precisely:
1. Gender (male/female) with confidence percentage
2. Exact age estimate in years
3. Is this a real photo or a spoof/fake (printed photo, screen photo, mask)?
4. Ethnicity estimate
5. Dominant emotion
Respond ONLY with JSON: {"gender": "...", "gender_confidence": 0-100, "age": <number>, "is_real": true/false, "spoof_type": "none/print/screen/mask", "ethnicity": "...", "emotion": "..."}"""
    try:
        b64 = _img_to_base64(fb)
        ai_result = await _external_ai_vision(b64, prompt, provider)
        results["external"] = _parse_ai_json(ai_result["raw"])
        results["external"]["provider"] = ai_result["provider"]
    except Exception as e:
        results["external"] = {"error": str(e)}

    # Build consensus
    int_gender = results["internal"].get("gender", {}).get("gender")
    ext_gender = results["external"].get("gender")
    if int_gender and ext_gender:
        results["consensus"]["gender"] = int_gender if int_gender == ext_gender else f"internal={int_gender}, external={ext_gender}"
        results["consensus"]["gender_match"] = (int_gender.lower() == ext_gender.lower()) if ext_gender else False

    int_age = results["internal"].get("age", {}).get("age")
    ext_age = results["external"].get("age")
    if int_age and ext_age:
        try:
            results["consensus"]["age_internal"] = float(int_age)
            results["consensus"]["age_external"] = float(ext_age)
            results["consensus"]["age_diff"] = abs(float(int_age) - float(ext_age))
        except (ValueError, TypeError):
            pass

    results["time_ms"] = round((time.time() - t0) * 1000, 1)
    return results


@app.post("/api/ai/emotion")
async def api_ai_emotion(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """Emotion/expression detection using external AI."""
    t0 = time.time()
    fb = await image.read()
    prompt = """Analyze the facial expression in this image.
Detect the dominant emotion and provide confidence scores for each emotion.
Respond ONLY with JSON: {"dominant": "...", "confidence": 0-100, "emotions": {"happy": 0-100, "sad": 0-100, "angry": 0-100, "surprised": 0-100, "neutral": 0-100, "fearful": 0-100, "disgusted": 0-100}}"""
    b64 = _img_to_base64(fb)
    ai_result = await _external_ai_vision(b64, prompt, provider)
    parsed = _parse_ai_json(ai_result["raw"])
    parsed["source"] = f"external-{ai_result['provider']}"
    parsed["time_ms"] = round((time.time() - t0) * 1000, 1)
    return parsed


@app.post("/api/ai/ethnicity")
async def api_ai_ethnicity(image: UploadFile = File(...), provider: str = Form(None), user=Depends(verify_api_key)):
    """Ethnicity estimation using external AI."""
    t0 = time.time()
    fb = await image.read()
    prompt = """Analyze this face image and estimate the person's ethnicity/race.
Provide probabilities for major ethnic groups.
Respond ONLY with JSON: {"primary": "...", "confidence": 0-100, "probabilities": {"east_asian": 0-100, "south_asian": 0-100, "middle_eastern": 0-100, "african": 0-100, "caucasian": 0-100, "latino": 0-100}}"""
    b64 = _img_to_base64(fb)
    ai_result = await _external_ai_vision(b64, prompt, provider)
    parsed = _parse_ai_json(ai_result["raw"])
    parsed["source"] = f"external-{ai_result['provider']}"
    parsed["time_ms"] = round((time.time() - t0) * 1000, 1)
    return parsed
