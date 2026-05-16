# ============================================================
# 📄 preprocessing.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[preprocessing.py] ▶ Module loaded')
#   • logger.info('[preprocessing.py] ▶ preprocess_face() called')
# ============================================================
"""
Face Image Preprocessing
=========================
Normalize face images: same padding, resize to 160x160,
consistent preprocessing between CLI and API.
"""

import logging
from typing import Tuple, Optional, Dict

import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("face-api")
logger.info('[preprocessing.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
CONFIG = {
    'target_size': (160, 160),
    'padding_color': (128, 128, 128),  # Gray padding
}

logger.info(f'[preprocessing.py] ▶ Config: {CONFIG}')


# ============================================================
# PREPROCESSING FUNCTIONS
# ============================================================
def resize_with_padding(
    image: np.ndarray,
    target_size: Tuple[int, int] = CONFIG['target_size'],
    padding_color: Tuple[int, int, int] = CONFIG['padding_color']
) -> np.ndarray:
    """
    Resize image with aspect ratio preservation + padding.

    Args:
        image: OpenCV image (BGR)
        target_size: Target size (H, W)
        padding_color: Color for padding (BGR)

    Returns:
        Resized image with padding, shape (H, W, 3)
    """
    logger.info(f'[preprocessing.py] ▶ resize_with_padding() called (target={target_size})')

    h, w = image.shape[:2]
    target_h, target_w = target_size

    # Calculate scale to fit within target
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    logger.info(f'[preprocessing.py] ▶ Original: {h}x{w}, Scaled: {new_h}x{new_w}')

    # Resize
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    # Create padded canvas
    canvas = np.full((target_h, target_w, 3), padding_color, dtype=np.uint8)

    # Center image on canvas
    y_offset = (target_h - new_h) // 2
    x_offset = (target_w - new_w) // 2

    canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized

    logger.info(f'[preprocessing.py] ▶ Final shape: {canvas.shape}')

    return canvas


def normalize_image(image: np.ndarray) -> np.ndarray:
    """
    Normalize image pixels to [0, 1] range.

    Args:
        image: OpenCV image (uint8, BGR)

    Returns:
        Normalized float32 image
    """
    logger.info('[preprocessing.py] ▶ normalize_image() called')

    normalized = image.astype(np.float32) / 255.0
    logger.info(f'[preprocessing.py] ▶ Normalized to range [0, 1]')

    return normalized


def histogram_equalization(image: np.ndarray) -> np.ndarray:
    """
    Apply histogram equalization to improve contrast.

    Args:
        image: OpenCV image (BGR or grayscale)

    Returns:
        Equalized image
    """
    logger.info('[preprocessing.py] ▶ histogram_equalization() called')

    if len(image.shape) == 3:  # BGR
        # Convert to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Equalize V channel
        v = cv2.equalizeHist(v)

        # Merge back
        hsv = cv2.merge([h, s, v])
        equalized = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        logger.info('[preprocessing.py] ▶ Histogram equalization applied (HSV-V)')
    else:  # Grayscale
        equalized = cv2.equalizeHist(image)
        logger.info('[preprocessing.py] ▶ Histogram equalization applied (grayscale)')

    return equalized


def preprocess_face(
    image: np.ndarray,
    target_size: Tuple[int, int] = CONFIG['target_size'],
    normalize: bool = True,
    equalize: bool = True
) -> Dict:
    """
    Preprocess face image for model input.

    Args:
        image: OpenCV image (BGR)
        target_size: Target size (H, W)
        normalize: Whether to normalize to [0, 1]
        equalize: Whether to apply histogram equalization

    Returns:
        {
            "image": preprocessed image array,
            "shape": tuple,
            "dtype": str,
            "error": str (if applicable)
        }
    """
    logger.info('[preprocessing.py] ▶ preprocess_face() called')

    try:
        original_shape = image.shape
        logger.info(f'[preprocessing.py] ▶ Original shape: {original_shape}')

        # Ensure BGR
        if len(image.shape) == 2:
            logger.info('[preprocessing.py] ▶ Converting grayscale to BGR')
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

        # Resize with padding
        image = resize_with_padding(image, target_size)

        # Histogram equalization
        if equalize:
            image = histogram_equalization(image)

        # Normalize
        if normalize:
            image = normalize_image(image)
            output_dtype = 'float32'
        else:
            output_dtype = 'uint8'

        logger.info(f'[preprocessing.py] ▶ Preprocessing complete: shape={image.shape}, dtype={output_dtype}')

        return {
            "image": image,
            "shape": image.shape,
            "dtype": output_dtype,
        }

    except Exception as e:
        logger.error(f'[preprocessing.py] ▶ Preprocessing failed: {e}')
        return {
            "image": None,
            "shape": None,
            "dtype": None,
            "error": str(e),
        }


# ============================================================
# BATCH PREPROCESSING
# ============================================================
def preprocess_faces_batch(
    images: list,
    target_size: Tuple[int, int] = CONFIG['target_size'],
    normalize: bool = True,
    equalize: bool = True
) -> Dict:
    """
    Preprocess multiple face images.

    Args:
        images: List of OpenCV images

    Returns:
        {
            "images": list of preprocessed images,
            "failed": int (number of failed preprocessing),
        }
    """
    logger.info(f'[preprocessing.py] ▶ preprocess_faces_batch() called with {len(images)} images')

    preprocessed = []
    failed_count = 0

    for i, image in enumerate(images):
        result = preprocess_face(image, target_size, normalize, equalize)
        if result["error"] is None:
            preprocessed.append(result["image"])
        else:
            logger.warning(f'[preprocessing.py] ▶ Image {i} failed: {result["error"]}')
            failed_count += 1

    logger.info(f'[preprocessing.py] ▶ Batch processing complete: {len(preprocessed)} successful, {failed_count} failed')

    return {
        "images": preprocessed,
        "failed": failed_count,
    }


# ============================================================
# UTILITY FUNCTIONS
# ============================================================
def load_image_from_path(image_path: str) -> Optional[np.ndarray]:
    """
    Load image from file path.

    Args:
        image_path: Path to image file

    Returns:
        OpenCV image (BGR) or None
    """
    logger.info(f'[preprocessing.py] ▶ load_image_from_path() called: {image_path}')

    try:
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f'[preprocessing.py] ▶ Failed to load image: {image_path}')
            return None
        logger.info(f'[preprocessing.py] ▶ Image loaded: {image.shape}')
        return image
    except Exception as e:
        logger.error(f'[preprocessing.py] ▶ Error loading image: {e}')
        return None


def load_image_from_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Load image from bytes.

    Args:
        image_bytes: Image data as bytes

    Returns:
        OpenCV image (BGR) or None
    """
    logger.info('[preprocessing.py] ▶ load_image_from_bytes() called')

    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            logger.error('[preprocessing.py] ▶ Failed to decode image from bytes')
            return None
        logger.info(f'[preprocessing.py] ▶ Image decoded: {image.shape}')
        return image
    except Exception as e:
        logger.error(f'[preprocessing.py] ▶ Error decoding image: {e}')
        return None
