# ============================================================
# 📄 voice_analysis.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[voice_analysis.py] ▶ Module loaded')
#   • logger.info('[voice_analysis.py] ▶ extract_features() called')
# ============================================================
"""
Voice Gender Recognition - Feature Extraction
==============================================
Extract 90+ audio features using librosa including:
  - MFCC (Mel-Frequency Cepstral Coefficients)
  - Zero Crossing Rate (ZCR)
  - Spectral features (centroid, bandwidth, rolloff)
  - Chroma features
  - RMS energy
"""

import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import numpy as np
import librosa
from scipy.stats import skew, kurtosis

# ============================================================
# LOGGING
# ============================================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)
logger.info('[voice_analysis.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
CONFIG = {
    'sample_rate': 16000,
    'n_mfcc': 13,
    'n_fft': 2048,
    'hop_length': 512,
    'n_chroma': 12,
}


# ============================================================
# FEATURE EXTRACTION FUNCTIONS
# ============================================================
def extract_mfcc_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Extract MFCC features (13 coefficients + derivatives).
    Returns: mean, std, min, max for each coefficient (52 features).
    """
    logger.info('[voice_analysis.py] ▶ extract_mfcc_features() called')

    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=CONFIG['n_mfcc'])
    mfcc_delta = librosa.feature.delta(mfcc)

    features = {}
    for i in range(CONFIG['n_mfcc']):
        features[f'mfcc_{i:02d}_mean'] = float(np.mean(mfcc[i]))
        features[f'mfcc_{i:02d}_std'] = float(np.std(mfcc[i]))
        features[f'mfcc_{i:02d}_min'] = float(np.min(mfcc[i]))
        features[f'mfcc_{i:02d}_max'] = float(np.max(mfcc[i]))

        features[f'mfcc_delta_{i:02d}_mean'] = float(np.mean(mfcc_delta[i]))
        features[f'mfcc_delta_{i:02d}_std'] = float(np.std(mfcc_delta[i]))

    logger.info(f'[voice_analysis.py] ▶ Extracted {len(features)} MFCC features')
    return features


def extract_zcr_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Extract Zero Crossing Rate (ZCR) features.
    Returns: mean, std, min, max (4 features).
    """
    logger.info('[voice_analysis.py] ▶ extract_zcr_features() called')

    zcr = librosa.feature.zero_crossing_rate(y)[0]

    features = {
        'zcr_mean': float(np.mean(zcr)),
        'zcr_std': float(np.std(zcr)),
        'zcr_min': float(np.min(zcr)),
        'zcr_max': float(np.max(zcr)),
    }

    logger.info('[voice_analysis.py] ▶ Extracted ZCR features')
    return features


def extract_spectral_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Extract spectral features: centroid, bandwidth, rolloff, flatness.
    Returns: 12 features.
    """
    logger.info('[voice_analysis.py] ▶ extract_spectral_features() called')

    spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    spec_bw = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    spec_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
    spec_flatness = librosa.feature.spectral_flatness(y=y)[0]

    features = {
        'spectral_centroid_mean': float(np.mean(spec_cent)),
        'spectral_centroid_std': float(np.std(spec_cent)),
        'spectral_centroid_min': float(np.min(spec_cent)),
        'spectral_centroid_max': float(np.max(spec_cent)),

        'spectral_bandwidth_mean': float(np.mean(spec_bw)),
        'spectral_bandwidth_std': float(np.std(spec_bw)),

        'spectral_rolloff_mean': float(np.mean(spec_rolloff)),
        'spectral_rolloff_std': float(np.std(spec_rolloff)),

        'spectral_flatness_mean': float(np.mean(spec_flatness)),
        'spectral_flatness_std': float(np.std(spec_flatness)),
    }

    logger.info('[voice_analysis.py] ▶ Extracted spectral features')
    return features


def extract_chroma_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Extract chroma features (12 pitch classes).
    Returns: mean, std for each chroma (24 features).
    """
    logger.info('[voice_analysis.py] ▶ extract_chroma_features() called')

    chroma = librosa.feature.chroma_stft(y=y, sr=sr, n_chroma=CONFIG['n_chroma'])

    features = {}
    for i in range(CONFIG['n_chroma']):
        features[f'chroma_{i:02d}_mean'] = float(np.mean(chroma[i]))
        features[f'chroma_{i:02d}_std'] = float(np.std(chroma[i]))

    logger.info('[voice_analysis.py] ▶ Extracted chroma features')
    return features


def extract_energy_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Extract energy-related features: RMS, loudness.
    Returns: 8 features.
    """
    logger.info('[voice_analysis.py] ▶ extract_energy_features() called')

    rms = librosa.feature.rms(y=y)[0]
    S = np.abs(librosa.stft(y))
    loudness = np.sqrt(np.mean(S ** 2, axis=0))

    features = {
        'rms_mean': float(np.mean(rms)),
        'rms_std': float(np.std(rms)),
        'rms_min': float(np.min(rms)),
        'rms_max': float(np.max(rms)),

        'loudness_mean': float(np.mean(loudness)),
        'loudness_std': float(np.std(loudness)),
        'loudness_min': float(np.min(loudness)),
        'loudness_max': float(np.max(loudness)),
    }

    logger.info('[voice_analysis.py] ▶ Extracted energy features')
    return features


def extract_tempo_features(y: np.ndarray, sr: int) -> Dict[str, float]:
    """
    Extract tempo and onset-related features.
    Returns: 4 features.
    """
    logger.info('[voice_analysis.py] ▶ extract_tempo_features() called')

    try:
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
        onset_rate = len(onset_frames) / librosa.get_duration(y=y, sr=sr)

        features = {
            'onset_count': float(len(onset_frames)),
            'onset_rate': float(onset_rate),
        }
    except Exception as e:
        logger.warning(f'[voice_analysis.py] ▶ Tempo extraction failed: {e}')
        features = {
            'onset_count': 0.0,
            'onset_rate': 0.0,
        }

    logger.info('[voice_analysis.py] ▶ Extracted tempo features')
    return features


def extract_statistical_features(y: np.ndarray) -> Dict[str, float]:
    """
    Extract statistical features from raw audio: skewness, kurtosis, variance.
    Returns: 4 features.
    """
    logger.info('[voice_analysis.py] ▶ extract_statistical_features() called')

    features = {
        'audio_skewness': float(skew(y)),
        'audio_kurtosis': float(kurtosis(y)),
        'audio_variance': float(np.var(y)),
        'audio_range': float(np.max(y) - np.min(y)),
    }

    logger.info('[voice_analysis.py] ▶ Extracted statistical features')
    return features


# ============================================================
# MAIN FEATURE EXTRACTION FUNCTION
# ============================================================
def extract_features(audio_path: str, sr: int = CONFIG['sample_rate']) -> Dict[str, float]:
    """
    Extract all 90+ audio features from audio file.

    Args:
        audio_path: Path to audio file (.wav, .mp3, etc.)
        sr: Sample rate for loading audio

    Returns:
        Dictionary with 90+ features (MFCC, ZCR, spectral, chroma, energy, tempo, stats)
    """
    logger.info(f'[voice_analysis.py] ▶ extract_features() called for {audio_path}')

    try:
        # Load audio
        y, sr_loaded = librosa.load(audio_path, sr=sr)
        logger.info(f'[voice_analysis.py] ▶ Audio loaded: {len(y)} samples at {sr_loaded}Hz')

        # Normalize
        if np.max(np.abs(y)) > 0:
            y = y / np.max(np.abs(y))

        # Extract all feature groups
        all_features = {}
        all_features.update(extract_mfcc_features(y, sr_loaded))
        all_features.update(extract_zcr_features(y, sr_loaded))
        all_features.update(extract_spectral_features(y, sr_loaded))
        all_features.update(extract_chroma_features(y, sr_loaded))
        all_features.update(extract_energy_features(y, sr_loaded))
        all_features.update(extract_tempo_features(y, sr_loaded))
        all_features.update(extract_statistical_features(y))

        logger.info(f'[voice_analysis.py] ▶ Total features extracted: {len(all_features)}')
        return all_features

    except Exception as e:
        logger.error(f'[voice_analysis.py] ▶ Feature extraction failed: {e}')
        raise


def features_to_vector(features: Dict[str, float]) -> np.ndarray:
    """
    Convert feature dictionary to sorted numpy vector for ML model input.

    Args:
        features: Dictionary of feature name -> value

    Returns:
        1D numpy array of feature values (sorted by key name for consistency)
    """
    logger.info('[voice_analysis.py] ▶ features_to_vector() called')

    sorted_features = sorted(features.items())
    vector = np.array([v for k, v in sorted_features], dtype=np.float32)

    logger.info(f'[voice_analysis.py] ▶ Features converted to vector: shape {vector.shape}')
    return vector
