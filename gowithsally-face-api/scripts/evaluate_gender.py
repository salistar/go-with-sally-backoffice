# ============================================================
# 📄 evaluate_gender.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[evaluate_gender.py] ▶ Module loaded')
#   • logger.info('[evaluate_gender.py] ▶ function_name() called')
# ============================================================
"""
Gender Model Evaluation
========================
Generate confusion matrix, precision/recall per gender, evaluate on test set
(especially Moroccan photos for regional bias assessment).
"""

import os
import sys
import logging
import json
from pathlib import Path
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms
from torchvision.models import resnet18
from PIL import Image
import matplotlib.pyplot as plt
from sklearn.metrics import (
    confusion_matrix, classification_report,
    precision_recall_fscore_support, accuracy_score
)
import seaborn as sns

# ============================================================
# LOGGING CONFIGURATION
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)
logger.info('[evaluate_gender.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data" / "gender_test_moroccan"
OUTPUT_DIR = BASE_DIR / "models" / "gender"
EVAL_DIR = OUTPUT_DIR / "evaluation_results"

EVAL_DIR.mkdir(parents=True, exist_ok=True)

CONFIG = {
    'input_size': (224, 224),
    'num_classes': 2,
    'batch_size': 32,
    'device': 'cuda' if torch.cuda.is_available() else 'cpu',
}

logger.info(f'[evaluate_gender.py] ▶ Using device: {CONFIG["device"]}')


# ============================================================
# CUSTOM DATASET CLASS
# ============================================================
class GenderTestDataset(Dataset):
    """
    Test dataset for gender classification evaluation.
    Expected structure:
      data/gender_test_moroccan/
        ├── female/
        │   ├── image1.jpg
        │   └── ...
        └── male/
            ├── image1.jpg
            └── ...
    """

    def __init__(self, image_dir, transform=None):
        logger.info('[evaluate_gender.py] ▶ GenderTestDataset.__init__() called')
        self.image_dir = Path(image_dir)
        self.transform = transform
        self.images = []
        self.labels = []
        self.image_paths = []
        self.class_to_idx = {'female': 0, 'male': 1}

        for class_name, class_idx in self.class_to_idx.items():
            class_dir = self.image_dir / class_name
            if class_dir.exists():
                for img_file in class_dir.glob('*.jpg'):
                    self.images.append(img_file)
                    self.labels.append(class_idx)
                    self.image_paths.append(str(img_file))
                logger.info(f'[evaluate_gender.py] ▶ Found {len(list(class_dir.glob("*.jpg")))} {class_name} test images')

        logger.info(f'[evaluate_gender.py] ▶ Total test images loaded: {len(self.images)}')

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]

        try:
            image = Image.open(img_path).convert('RGB')
            if self.transform:
                image = self.transform(image)
            return image, label, str(img_path)
        except Exception as e:
            logger.error(f'[evaluate_gender.py] ▶ Error loading {img_path}: {e}')
            return None, None, None


# ============================================================
# MODEL LOADING
# ============================================================
def load_model(model_path, device):
    logger.info(f'[evaluate_gender.py] ▶ load_model() called with {model_path}')

    model = resnet18(pretrained=False)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, CONFIG['num_classes'])

    if not Path(model_path).exists():
        logger.error(f'[evaluate_gender.py] ▶ Model not found: {model_path}')
        return None

    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()
    logger.info(f'[evaluate_gender.py] ▶ Model loaded successfully')

    return model


# ============================================================
# EVALUATION METRICS
# ============================================================
def evaluate_model(model, test_loader, device):
    logger.info('[evaluate_gender.py] ▶ evaluate_model() called')

    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for images, labels, paths in test_loader:
            if images is None or labels is None:
                continue

            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)

            _, predicted = torch.max(outputs.data, 1)

            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)

    logger.info('[evaluate_gender.py] ▶ Predictions collected')

    return all_preds, all_labels, all_probs


def compute_metrics(predictions, labels):
    logger.info('[evaluate_gender.py] ▶ compute_metrics() called')

    cm = confusion_matrix(labels, predictions)
    logger.info(f'[evaluate_gender.py] ▶ Confusion Matrix:\n{cm}')

    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average=None, zero_division=0
    )
    overall_accuracy = accuracy_score(labels, predictions)

    class_names = ['Female', 'Male']
    metrics = {
        'overall_accuracy': float(overall_accuracy),
        'confusion_matrix': cm.tolist(),
        'per_class_metrics': {}
    }

    for i, class_name in enumerate(class_names):
        metrics['per_class_metrics'][class_name] = {
            'precision': float(precision[i]),
            'recall': float(recall[i]),
            'f1_score': float(f1[i])
        }
        logger.info(f'[evaluate_gender.py] ▶ {class_name}: P={precision[i]:.3f}, R={recall[i]:.3f}, F1={f1[i]:.3f}')

    return metrics, cm


# ============================================================
# VISUALIZATION
# ============================================================
def plot_confusion_matrix(cm, save_path):
    logger.info('[evaluate_gender.py] ▶ plot_confusion_matrix() called')

    fig, ax = plt.subplots(figsize=(8, 6))
    class_names = ['Female', 'Male']

    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=class_names, yticklabels=class_names,
        ax=ax, cbar_kws={'label': 'Count'}
    )
    ax.set_xlabel('Predicted Label')
    ax.set_ylabel('True Label')
    ax.set_title('Gender Classification - Confusion Matrix')

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    logger.info(f'[evaluate_gender.py] ▶ Confusion matrix saved: {save_path}')


def plot_precision_recall(metrics, save_path):
    logger.info('[evaluate_gender.py] ▶ plot_precision_recall() called')

    class_names = list(metrics['per_class_metrics'].keys())
    precisions = [metrics['per_class_metrics'][c]['precision'] for c in class_names]
    recalls = [metrics['per_class_metrics'][c]['recall'] for c in class_names]
    f1_scores = [metrics['per_class_metrics'][c]['f1_score'] for c in class_names]

    x = np.arange(len(class_names))
    width = 0.25

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(x - width, precisions, width, label='Precision')
    ax.bar(x, recalls, width, label='Recall')
    ax.bar(x + width, f1_scores, width, label='F1-Score')

    ax.set_xlabel('Gender Class')
    ax.set_ylabel('Score')
    ax.set_title('Gender Model - Per-Class Metrics')
    ax.set_xticks(x)
    ax.set_xticklabels(class_names)
    ax.legend()

    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    logger.info(f'[evaluate_gender.py] ▶ Precision/Recall plot saved: {save_path}')


# ============================================================
# MAIN EVALUATION FUNCTION
# ============================================================
def main():
    logger.info('[evaluate_gender.py] ▶ main() called')

    # Find latest model
    model_files = list(OUTPUT_DIR.glob('gender_model_mena_finetuned_*.pth'))
    if not model_files:
        logger.error('[evaluate_gender.py] ▶ No fine-tuned models found in models/gender/')
        logger.info('[evaluate_gender.py] ▶ Please run finetune_gender_mena.py first')
        sys.exit(1)

    latest_model = sorted(model_files)[-1]
    logger.info(f'[evaluate_gender.py] ▶ Using latest model: {latest_model}')

    # Load model
    model = load_model(latest_model, CONFIG['device'])
    if model is None:
        sys.exit(1)

    # Prepare test dataset
    if not DATA_DIR.exists():
        logger.warning(f'[evaluate_gender.py] ▶ Test data directory not found: {DATA_DIR}')
        logger.warning('[evaluate_gender.py] ▶ Create test dataset: data/gender_test_moroccan/{female,male}/*.jpg')
        sys.exit(1)

    val_transform = transforms.Compose([
        transforms.Resize(CONFIG['input_size']),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    test_dataset = GenderTestDataset(DATA_DIR, transform=val_transform)

    if len(test_dataset) == 0:
        logger.error('[evaluate_gender.py] ▶ No test images found')
        sys.exit(1)

    test_loader = DataLoader(test_dataset, batch_size=CONFIG['batch_size'], shuffle=False)

    # Evaluate
    predictions, labels, probabilities = evaluate_model(model, test_loader, CONFIG['device'])

    # Compute metrics
    metrics, cm = compute_metrics(predictions, labels)

    # Save metrics
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    metrics_path = EVAL_DIR / f'evaluation_metrics_{timestamp}.json'
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    logger.info(f'[evaluate_gender.py] ▶ Metrics saved: {metrics_path}')

    # Plot confusion matrix
    cm_plot_path = EVAL_DIR / f'confusion_matrix_{timestamp}.png'
    plot_confusion_matrix(cm, cm_plot_path)

    # Plot precision/recall
    pr_plot_path = EVAL_DIR / f'precision_recall_{timestamp}.png'
    plot_precision_recall(metrics, pr_plot_path)

    # Print summary
    logger.info('='*60)
    logger.info('[evaluate_gender.py] ▶ EVALUATION SUMMARY')
    logger.info('='*60)
    logger.info(f'[evaluate_gender.py] ▶ Overall Accuracy: {metrics["overall_accuracy"]:.4f}')
    for class_name, class_metrics in metrics['per_class_metrics'].items():
        logger.info(f'[evaluate_gender.py] ▶ {class_name}:')
        logger.info(f'  Precision: {class_metrics["precision"]:.4f}')
        logger.info(f'  Recall: {class_metrics["recall"]:.4f}')
        logger.info(f'  F1-Score: {class_metrics["f1_score"]:.4f}')
    logger.info('='*60)

    logger.info('[evaluate_gender.py] ▶ Evaluation complete')


if __name__ == '__main__':
    main()
