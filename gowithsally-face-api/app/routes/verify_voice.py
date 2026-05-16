# ============================================================
# 📄 verify_voice.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[verify_voice.py] ▶ Module loaded')
#   • logger.info('[verify_voice.py] ▶ POST /verify-voice called')
# ============================================================
"""
Voice Gender Verification Route
================================
FastAPI endpoint to receive audio, extract features, and predict gender.
"""

import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import numpy as np

# Add parent directory imports
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.voice_analysis import extract_features, features_to_vector

# ============================================================
# LOGGING
# ============================================================
logger = logging.getLogger("face-api")
logger.info('[verify_voice.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
VOICE_MODEL_DIR = MODELS_DIR / "voice_gender"

# Try to load voice gender models (lazy loading)
VOICE_MODELS_AVAILABLE = False
svm_model = None
scaler = None
var_selector = None
label_encoder = None

try:
    import pickle
    if (VOICE_MODEL_DIR / "best_model.pkl").exists():
        with open(VOICE_MODEL_DIR / "best_model.pkl", "rb") as f:
            svm_model = pickle.load(f)
        with open(VOICE_MODEL_DIR / "scaler.pkl", "rb") as f:
            scaler = pickle.load(f)
        with open(VOICE_MODEL_DIR / "var_selector.pkl", "rb") as f:
            var_selector = pickle.load(f)
        with open(VOICE_MODEL_DIR / "label_encoder.pkl", "rb") as f:
            label_encoder = pickle.load(f)
        VOICE_MODELS_AVAILABLE = True
        logger.info('[verify_voice.py] ▶ Voice gender models loaded successfully')
except Exception as e:
    logger.warning(f'[verify_voice.py] ▶ Could not load voice models: {e}')

# ============================================================
# ROUTER
# ============================================================
router = APIRouter(prefix="/api/voice", tags=["voice"])

# ============================================================
# ENDPOINTS
# ============================================================
@router.post("/verify-gender")
async def verify_voice_gender(
    audio: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
):
    """
    Verify user gender from voice sample.

    Args:
        audio: Audio file (WAV, MP3, etc.)
        user_id: Optional user ID for logging

    Returns:
        {
            "passed": bool,
            "gender": "female" | "male",
            "confidence": float (0-1),
            "features_count": int,
            "error": str (if applicable)
        }
    """
    logger.info('[verify_voice.py] ▶ POST /verify-gender called')
    logger.info(f'[verify_voice.py] ▶ User ID: {user_id}, Audio: {audio.filename}')

    if not VOICE_MODELS_AVAILABLE:
        logger.error('[verify_voice.py] ▶ Voice gender models not available')
        raise HTTPException(
            status_code=503,
            detail="Voice gender model not available. Please train model first."
        )

    try:
        # Save temp audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
            logger.info(f'[verify_voice.py] ▶ Temp audio saved: {tmp_path}')

        # Extract features
        logger.info('[verify_voice.py] ▶ Extracting voice features...')
        features = extract_features(tmp_path)
        feature_vector = features_to_vector(features)
        logger.info(f'[verify_voice.py] ▶ Extracted {len(features)} features')

        # Select features
        feature_vector_selected = var_selector.transform([feature_vector])[0]
        logger.info(f'[verify_voice.py] ▶ Selected features: {len(feature_vector_selected)}')

        # Scale features
        feature_vector_scaled = scaler.transform([feature_vector_selected])[0]
        logger.info('[verify_voice.py] ▶ Features scaled')

        # Predict
        prediction = svm_model.predict([feature_vector_scaled])[0]
        confidence_probs = svm_model.predict_proba([feature_vector_scaled])[0]
        confidence = float(np.max(confidence_probs))

        gender_label = label_encoder.inverse_transform([prediction])[0]
        logger.info(f'[verify_voice.py] ▶ Prediction: {gender_label} (confidence={confidence:.4f})')

        # Clean up
        Path(tmp_path).unlink()
        logger.info('[verify_voice.py] ▶ Temp file cleaned')

        return {
            "passed": True,
            "gender": gender_label.lower(),
            "confidence": confidence,
            "features_count": len(features),
        }

    except Exception as e:
        logger.error(f'[verify_voice.py] ▶ Voice verification failed: {e}')
        return {
            "passed": False,
            "error": str(e),
        }


@router.get("/health")
async def voice_health():
    """Check voice module health."""
    logger.info('[verify_voice.py] ▶ GET /health called')
    return {
        "status": "ok" if VOICE_MODELS_AVAILABLE else "models_not_loaded",
        "voice_models_available": VOICE_MODELS_AVAILABLE,
    }
