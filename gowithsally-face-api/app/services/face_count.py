# ============================================================
# 📄 face_count.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[face_count.py] ▶ Module loaded')
#   • logger.info('[face_count.py] ▶ count_faces() called')
# ============================================================
"""
Face Detection & Counting
==========================
Use YOLOv8-face or RetinaFace to detect and count faces.
Reject if count != 1.
"""

import logging
from pathlib import Path
from typing import Tuple, Optional, Dict

import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("face-api")
logger.info('[face_count.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
YOLO_FACE_PATH = MODELS_DIR / "facecount" / "yolo_face_best.pt"
YOLO_FACE_ALT = MODELS_DIR / "facecount" / "yolo_face" / "weights" / "best.pt"

# Try to load YOLO model
yolo_model = None
YOLO_AVAILABLE = False

try:
    from ultralytics import YOLO
    if YOLO_FACE_PATH.exists():
        yolo_model = YOLO(str(YOLO_FACE_PATH))
        YOLO_AVAILABLE = True
        logger.info('[face_count.py] ▶ YOLO face model loaded from primary path')
    elif YOLO_FACE_ALT.exists():
        yolo_model = YOLO(str(YOLO_FACE_ALT))
        YOLO_AVAILABLE = True
        logger.info('[face_count.py] ▶ YOLO face model loaded from alternate path')
    else:
        logger.warning('[face_count.py] ▶ YOLO face model files not found')
except Exception as e:
    logger.warning(f'[face_count.py] ▶ YOLO loading failed: {e}')


# ============================================================
# FALLBACK: OPENCV HAAR CASCADE
# ============================================================
CASCADE_PATH = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
logger.info(f'[face_count.py] ▶ OpenCV Haar cascade loaded as fallback')


# ============================================================
# FACE DETECTION FUNCTIONS
# ============================================================
def count_faces_yolo(image: np.ndarray) -> Tuple[int, list]:
    """
    Count faces using YOLOv8-face.
    Returns: (count, detections)
    """
    logger.info('[face_count.py] ▶ count_faces_yolo() called')

    if not YOLO_AVAILABLE or yolo_model is None:
        logger.error('[face_count.py] ▶ YOLO model not available')
        return 0, []

    try:
        results = yolo_model(image, verbose=False)
        detections = results[0].boxes.data.cpu().numpy()

        count = len(detections)
        logger.info(f'[face_count.py] ▶ YOLO detected {count} faces')

        return count, detections.tolist()

    except Exception as e:
        logger.error(f'[face_count.py] ▶ YOLO detection failed: {e}')
        return 0, []


def count_faces_haar(image: np.ndarray) -> Tuple[int, list]:
    """
    Count faces using OpenCV Haar Cascade (fallback).
    Returns: (count, detections)
    """
    logger.info('[face_count.py] ▶ count_faces_haar() called')

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5, minSize=(30, 30))

        count = len(faces)
        logger.info(f'[face_count.py] ▶ Haar cascade detected {count} faces')

        # Convert to detection format: [x, y, w, h, conf]
        detections = []
        for (x, y, w, h) in faces:
            detections.append([x, y, w, h, 0.9])  # confidence = 0.9 (arbitrary)

        return count, detections

    except Exception as e:
        logger.error(f'[face_count.py] ▶ Haar cascade detection failed: {e}')
        return 0, []


# ============================================================
# MAIN COUNTING FUNCTION
# ============================================================
def count_faces(image: np.ndarray) -> Dict:
    """
    Count faces in image. Use YOLO if available, fallback to Haar Cascade.

    Args:
        image: OpenCV image (BGR format)

    Returns:
        {
            "face_count": int,
            "passed": bool (True if count == 1),
            "method": str ("yolo" or "haar"),
            "detections": list,
            "error": str (if applicable)
        }
    """
    logger.info('[face_count.py] ▶ count_faces() called')

    try:
        # Try YOLO first
        if YOLO_AVAILABLE:
            count, detections = count_faces_yolo(image)
            method = "yolo"
        else:
            logger.info('[face_count.py] ▶ YOLO not available, using Haar Cascade')
            count, detections = count_faces_haar(image)
            method = "haar"

        passed = (count == 1)
        logger.info(f'[face_count.py] ▶ Result: count={count}, passed={passed}, method={method}')

        return {
            "face_count": count,
            "passed": passed,
            "method": method,
            "detections": detections,
        }

    except Exception as e:
        logger.error(f'[face_count.py] ▶ Face counting failed: {e}')
        return {
            "face_count": 0,
            "passed": False,
            "method": "error",
            "detections": [],
            "error": str(e),
        }


# ============================================================
# UTILITY FUNCTIONS
# ============================================================
def extract_face_region(image: np.ndarray, detection: list) -> Optional[np.ndarray]:
    """
    Extract face region from image given detection box.

    Args:
        image: OpenCV image
        detection: [x, y, w, h, conf] or [x1, y1, x2, y2, conf]

    Returns:
        Cropped face region or None
    """
    logger.info('[face_count.py] ▶ extract_face_region() called')

    try:
        h, w = image.shape[:2]

        # Determine box format
        if len(detection) >= 5:
            x, y, box_w, box_h = detection[0], detection[1], detection[2], detection[3]

            # If values look like coordinates (large), assume x1,y1,x2,y2 format
            if box_w > 100:  # likely x2, not width
                x1, y1, x2, y2 = int(detection[0]), int(detection[1]), int(detection[2]), int(detection[3])
            else:
                x1, y1, x2, y2 = int(x), int(y), int(x + box_w), int(y + box_h)

            # Ensure bounds
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)

            face_region = image[y1:y2, x1:x2]
            logger.info(f'[face_count.py] ▶ Extracted face region: {face_region.shape}')

            return face_region

    except Exception as e:
        logger.error(f'[face_count.py] ▶ Face extraction failed: {e}')

    return None
