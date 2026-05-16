# ============================================================
# 📄 train_voice_model.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[train_voice_model.py] ▶ Module loaded')
#   • logger.info('[train_voice_model.py] ▶ train_voice_model() called')
# ============================================================
"""
Voice Gender Recognition - SVM Training
========================================
Train Support Vector Machine (SVM) for gender classification
using 90+ audio features from voice samples.
"""

import os
import sys
import logging
import pickle
import json
from pathlib import Path
from datetime import datetime

import numpy as np
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_selection import SelectKBest, f_classif, mutual_info_classif
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_recall_fscore_support
)
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
import seaborn as sns

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.voice_analysis import extract_features, features_to_vector

# ============================================================
# LOGGING CONFIGURATION
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)
logger.info('[train_voice_model.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data" / "voice_training"
OUTPUT_DIR = MODELS_DIR / "voice_gender"
VOICE_MODEL_PATH = OUTPUT_DIR / "best_model.pkl"
VOICE_SCALER_PATH = OUTPUT_DIR / "scaler.pkl"
VOICE_LABEL_ENC_PATH = OUTPUT_DIR / "label_encoder.pkl"
VOICE_VAR_SEL_PATH = OUTPUT_DIR / "var_selector.pkl"
VOICE_MI_SEL_PATH = OUTPUT_DIR / "mi_selector.pkl"
VOICE_META_PATH = OUTPUT_DIR / "model_metadata.json"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CONFIG = {
    'svm_kernel': 'rbf',
    'svm_c': 1.0,
    'svm_gamma': 'scale',
    'num_features': 100,  # Top 100 features via SelectKBest
    'test_split': 0.2,
    'val_split': 0.2,
}

logger.info(f'[train_voice_model.py] ▶ Config: {CONFIG}')


# ============================================================
# DATA PREPARATION
# ============================================================
def load_audio_dataset(data_dir: Path):
    """
    Load audio files and extract features.
    Expected structure:
      data/voice_training/
        ├── female/
        │   ├── audio1.wav
        │   └── ...
        └── male/
            ├── audio1.wav
            └── ...
    """
    logger.info('[train_voice_model.py] ▶ load_audio_dataset() called')

    data_dir = Path(data_dir)
    X = []
    y = []
    failed_files = []

    class_map = {'female': 0, 'male': 1}

    for class_name, class_idx in class_map.items():
        class_dir = data_dir / class_name
        if not class_dir.exists():
            logger.warning(f'[train_voice_model.py] ▶ Class directory not found: {class_dir}')
            continue

        audio_files = list(class_dir.glob('*.wav')) + list(class_dir.glob('*.mp3'))
        logger.info(f'[train_voice_model.py] ▶ Found {len(audio_files)} {class_name} audio files')

        for audio_file in audio_files:
            try:
                logger.info(f'[train_voice_model.py] ▶ Extracting features: {audio_file.name}')
                features = extract_features(str(audio_file))
                feature_vector = features_to_vector(features)

                X.append(feature_vector)
                y.append(class_idx)

            except Exception as e:
                logger.error(f'[train_voice_model.py] ▶ Failed to process {audio_file}: {e}')
                failed_files.append(str(audio_file))

    if len(X) == 0:
        logger.error('[train_voice_model.py] ▶ No audio files processed successfully')
        return None, None

    X = np.array(X)
    y = np.array(y)

    logger.info(f'[train_voice_model.py] ▶ Loaded {len(X)} samples')
    logger.info(f'[train_voice_model.py] ▶ Failed files: {len(failed_files)}')

    return X, y


# ============================================================
# FEATURE SELECTION
# ============================================================
def select_features(X, y, num_features=100):
    """
    Select top features using SelectKBest with f_classif.
    """
    logger.info(f'[train_voice_model.py] ▶ select_features() called (n_features={num_features})')

    # Variance-based selector
    var_selector = SelectKBest(f_classif, k=min(num_features, X.shape[1]))
    X_selected = var_selector.fit_transform(X, y)

    logger.info(f'[train_voice_model.py] ▶ Selected {X_selected.shape[1]} features via f_classif')

    # Mutual information selector
    mi_selector = SelectKBest(mutual_info_classif, k=min(num_features, X.shape[1]))
    X_mi = mi_selector.fit_transform(X, y)

    logger.info(f'[train_voice_model.py] ▶ Selected {X_mi.shape[1]} features via mutual_info_classif')

    return X_selected, var_selector, X_mi, mi_selector


# ============================================================
# MODEL TRAINING
# ============================================================
def train_svm(X_train, y_train):
    """
    Train SVM classifier.
    """
    logger.info('[train_voice_model.py] ▶ train_svm() called')

    svm = SVC(
        kernel=CONFIG['svm_kernel'],
        C=CONFIG['svm_c'],
        gamma=CONFIG['svm_gamma'],
        probability=True,
        verbose=1
    )

    svm.fit(X_train, y_train)
    logger.info('[train_voice_model.py] ▶ SVM training complete')

    return svm


# ============================================================
# EVALUATION
# ============================================================
def evaluate_model(model, X_test, y_test):
    """
    Evaluate model on test set.
    """
    logger.info('[train_voice_model.py] ▶ evaluate_model() called')

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    report = classification_report(y_test, predictions, target_names=['Female', 'Male'])
    cm = confusion_matrix(y_test, predictions)

    logger.info(f'[train_voice_model.py] ▶ Test Accuracy: {accuracy:.4f}')
    logger.info(f'[train_voice_model.py] ▶ Classification Report:\n{report}')

    return accuracy, report, cm, predictions


# ============================================================
# VISUALIZATION
# ============================================================
def plot_confusion_matrix(cm, save_path):
    """
    Plot confusion matrix.
    """
    logger.info('[train_voice_model.py] ▶ plot_confusion_matrix() called')

    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=['Female', 'Male'],
        yticklabels=['Female', 'Male'],
        ax=ax
    )
    ax.set_xlabel('Predicted')
    ax.set_ylabel('True')
    ax.set_title('Voice Gender Recognition - Confusion Matrix')

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    logger.info(f'[train_voice_model.py] ▶ Confusion matrix saved: {save_path}')


# ============================================================
# MAIN TRAINING FUNCTION
# ============================================================
def main():
    logger.info('[train_voice_model.py] ▶ main() called')

    if not DATA_DIR.exists():
        logger.error(f'[train_voice_model.py] ▶ Data directory not found: {DATA_DIR}')
        logger.error('[train_voice_model.py] ▶ Expected structure: data/voice_training/{female,male}/*.wav')
        sys.exit(1)

    # Load dataset
    logger.info('[train_voice_model.py] ▶ Loading audio dataset...')
    X, y = load_audio_dataset(DATA_DIR)

    if X is None or len(X) == 0:
        logger.error('[train_voice_model.py] ▶ Failed to load dataset')
        sys.exit(1)

    logger.info(f'[train_voice_model.py] ▶ Dataset shape: {X.shape}')
    logger.info(f'[train_voice_model.py] ▶ Class distribution: {np.bincount(y)}')

    # Split dataset
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=CONFIG['test_split'], random_state=42, stratify=y
    )

    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val,
        test_size=CONFIG['val_split'] / (1 - CONFIG['test_split']),
        random_state=42, stratify=y_train_val
    )

    logger.info(f'[train_voice_model.py] ▶ Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}')

    # Feature selection
    X_train_sel, var_selector, X_train_mi, mi_selector = select_features(X_train, y_train, CONFIG['num_features'])

    # Scale features
    logger.info('[train_voice_model.py] ▶ Scaling features...')
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_sel)
    X_val_scaled = scaler.transform(var_selector.transform(X_val))
    X_test_scaled = scaler.transform(var_selector.transform(X_test))

    # Train SVM
    logger.info('[train_voice_model.py] ▶ Training SVM...')
    svm = train_svm(X_train_scaled, y_train)

    # Validate
    logger.info('[train_voice_model.py] ▶ Validating on validation set...')
    val_accuracy, _, _, _ = evaluate_model(svm, X_val_scaled, y_val)

    # Evaluate
    logger.info('[train_voice_model.py] ▶ Evaluating on test set...')
    test_accuracy, report, cm, predictions = evaluate_model(svm, X_test_scaled, y_test)

    # Save model
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    with open(VOICE_MODEL_PATH, 'wb') as f:
        pickle.dump(svm, f)
    logger.info(f'[train_voice_model.py] ▶ Model saved: {VOICE_MODEL_PATH}')

    with open(VOICE_SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)
    logger.info(f'[train_voice_model.py] ▶ Scaler saved: {VOICE_SCALER_PATH}')

    with open(VOICE_VAR_SEL_PATH, 'wb') as f:
        pickle.dump(var_selector, f)
    logger.info(f'[train_voice_model.py] ▶ Variance selector saved: {VOICE_VAR_SEL_PATH}')

    with open(VOICE_MI_SEL_PATH, 'wb') as f:
        pickle.dump(mi_selector, f)
    logger.info(f'[train_voice_model.py] ▶ MI selector saved: {VOICE_MI_SEL_PATH}')

    # Save label encoder
    label_encoder = LabelEncoder()
    label_encoder.fit(['Female', 'Male'])
    with open(VOICE_LABEL_ENC_PATH, 'wb') as f:
        pickle.dump(label_encoder, f)
    logger.info(f'[train_voice_model.py] ▶ Label encoder saved: {VOICE_LABEL_ENC_PATH}')

    # Save metadata
    metadata = {
        'timestamp': timestamp,
        'num_features': CONFIG['num_features'],
        'svm_kernel': CONFIG['svm_kernel'],
        'svm_c': CONFIG['svm_c'],
        'svm_gamma': CONFIG['svm_gamma'],
        'train_accuracy': float(svm.score(X_train_scaled, y_train)),
        'val_accuracy': float(val_accuracy),
        'test_accuracy': float(test_accuracy),
        'feature_count': X_train_sel.shape[1],
        'confusion_matrix': cm.tolist(),
    }

    with open(VOICE_META_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info(f'[train_voice_model.py] ▶ Metadata saved: {VOICE_META_PATH}')

    # Plot confusion matrix
    cm_plot = OUTPUT_DIR / f'confusion_matrix_{timestamp}.png'
    plot_confusion_matrix(cm, cm_plot)

    # Summary
    logger.info('='*60)
    logger.info('[train_voice_model.py] ▶ TRAINING SUMMARY')
    logger.info('='*60)
    logger.info(f'[train_voice_model.py] ▶ Train Accuracy: {metadata["train_accuracy"]:.4f}')
    logger.info(f'[train_voice_model.py] ▶ Val Accuracy:   {metadata["val_accuracy"]:.4f}')
    logger.info(f'[train_voice_model.py] ▶ Test Accuracy:  {metadata["test_accuracy"]:.4f}')
    logger.info('='*60)

    logger.info('[train_voice_model.py] ▶ Training complete')


if __name__ == '__main__':
    main()
