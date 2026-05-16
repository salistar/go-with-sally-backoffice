# ============================================================
# 📄 finetune_gender_mena.py — GoWithSally AI/ML
# LOG SUMMARY:
#   • logger.info('[finetune_gender_mena.py] ▶ Module loaded')
#   • logger.info('[finetune_gender_mena.py] ▶ function_name() called')
# ============================================================
"""
Gender Model Fine-tuning for MENA Regions
=========================================
Load ResNet18 base model, unfreeze last 2 layers, fine-tune on MENA dataset
with augmentation, early stopping (patience=5), and save best model with metrics.
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
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms
from torchvision.models import resnet18
from PIL import Image
import matplotlib.pyplot as plt

# ============================================================
# LOGGING CONFIGURATION
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)
logger.info('[finetune_gender_mena.py] ▶ Module loaded')

# ============================================================
# CONFIGURATION
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data" / "gender_mena_dataset"
OUTPUT_DIR = BASE_DIR / "models" / "gender"
LOGS_DIR = OUTPUT_DIR / "training_logs"

# Create output directories
LOGS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Training configuration
CONFIG = {
    'batch_size': 32,
    'num_epochs': 50,
    'learning_rate': 0.001,
    'early_stopping_patience': 5,
    'test_split': 0.2,
    'val_split': 0.2,
    'input_size': (224, 224),
    'num_classes': 2,  # Female, Male
    'weight_decay': 1e-4,
    'device': 'cuda' if torch.cuda.is_available() else 'cpu',
}

logger.info(f'[finetune_gender_mena.py] ▶ Using device: {CONFIG["device"]}')
logger.info(f'[finetune_gender_mena.py] ▶ Config: {CONFIG}')


# ============================================================
# CUSTOM DATASET CLASS
# ============================================================
class GenderMENADataset(Dataset):
    """
    Custom dataset for MENA gender classification.
    Expected structure:
      data/gender_mena_dataset/
        ├── female/
        │   ├── image1.jpg
        │   └── ...
        └── male/
            ├── image1.jpg
            └── ...
    """

    def __init__(self, image_dir, transform=None):
        logger.info('[finetune_gender_mena.py] ▶ GenderMENADataset.__init__() called')
        self.image_dir = Path(image_dir)
        self.transform = transform
        self.images = []
        self.labels = []
        self.class_to_idx = {'female': 0, 'male': 1}

        for class_name, class_idx in self.class_to_idx.items():
            class_dir = self.image_dir / class_name
            if class_dir.exists():
                for img_file in class_dir.glob('*.jpg'):
                    self.images.append(img_file)
                    self.labels.append(class_idx)
                logger.info(f'[finetune_gender_mena.py] ▶ Found {len(list(class_dir.glob("*.jpg")))} {class_name} images')

        logger.info(f'[finetune_gender_mena.py] ▶ Total images loaded: {len(self.images)}')

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]

        try:
            image = Image.open(img_path).convert('RGB')
            if self.transform:
                image = self.transform(image)
            return image, label
        except Exception as e:
            logger.error(f'[finetune_gender_mena.py] ▶ Error loading {img_path}: {e}')
            return None, None


# ============================================================
# DATA AUGMENTATION
# ============================================================
def get_transforms():
    logger.info('[finetune_gender_mena.py] ▶ get_transforms() called')

    train_transform = transforms.Compose([
        transforms.Resize(CONFIG['input_size']),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    val_transform = transforms.Compose([
        transforms.Resize(CONFIG['input_size']),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    return train_transform, val_transform


# ============================================================
# MODEL CREATION & LAYER UNFREEZING
# ============================================================
def create_model():
    logger.info('[finetune_gender_mena.py] ▶ create_model() called')

    # Load pre-trained ResNet18
    model = resnet18(pretrained=True)
    logger.info('[finetune_gender_mena.py] ▶ ResNet18 loaded with pretrained weights')

    # Freeze all layers except last 2
    for name, param in model.named_parameters():
        if 'layer4' not in name and 'fc' not in name:
            param.requires_grad = False
        else:
            param.requires_grad = True

    logger.info('[finetune_gender_mena.py] ▶ Unfroze layer4 and fc layers')

    # Replace final fully connected layer
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, CONFIG['num_classes'])
    logger.info(f'[finetune_gender_mena.py] ▶ Replaced fc layer: {num_ftrs} → {CONFIG["num_classes"]}')

    return model.to(CONFIG['device'])


# ============================================================
# TRAINING FUNCTIONS
# ============================================================
def train_epoch(model, train_loader, criterion, optimizer, device):
    logger.info('[finetune_gender_mena.py] ▶ train_epoch() called')

    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (images, labels) in enumerate(train_loader):
        if images is None or labels is None:
            continue

        images, labels = images.to(device), labels.to(device)

        # Forward pass
        outputs = model(images)
        loss = criterion(outputs, labels)

        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        _, predicted = torch.max(outputs.data, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()

        if batch_idx % 10 == 0:
            logger.info(f'[finetune_gender_mena.py] ▶ Batch {batch_idx}: Loss={loss.item():.4f}')

    avg_loss = total_loss / len(train_loader)
    accuracy = 100.0 * correct / total
    logger.info(f'[finetune_gender_mena.py] ▶ Epoch complete: Loss={avg_loss:.4f}, Accuracy={accuracy:.2f}%')

    return avg_loss, accuracy


def validate(model, val_loader, criterion, device):
    logger.info('[finetune_gender_mena.py] ▶ validate() called')

    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in val_loader:
            if images is None or labels is None:
                continue

            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

    avg_loss = total_loss / len(val_loader)
    accuracy = 100.0 * correct / total
    logger.info(f'[finetune_gender_mena.py] ▶ Validation: Loss={avg_loss:.4f}, Accuracy={accuracy:.2f}%')

    return avg_loss, accuracy


# ============================================================
# EARLY STOPPING
# ============================================================
class EarlyStopping:
    def __init__(self, patience=5, verbose=True):
        logger.info(f'[finetune_gender_mena.py] ▶ EarlyStopping.__init__() called (patience={patience})')
        self.patience = patience
        self.verbose = verbose
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss < self.best_loss:
            self.best_loss = val_loss
            self.counter = 0
            logger.info(f'[finetune_gender_mena.py] ▶ New best loss: {val_loss:.4f}')
        else:
            self.counter += 1
            logger.info(f'[finetune_gender_mena.py] ▶ EarlyStopping: {self.counter}/{self.patience}')
            if self.counter >= self.patience:
                self.early_stop = True
                logger.info('[finetune_gender_mena.py] ▶ EarlyStopping triggered')


# ============================================================
# MAIN TRAINING LOOP
# ============================================================
def main():
    logger.info('[finetune_gender_mena.py] ▶ main() called')

    if not DATA_DIR.exists():
        logger.error(f'[finetune_gender_mena.py] ▶ Data directory not found: {DATA_DIR}')
        logger.error('[finetune_gender_mena.py] ▶ Expected structure: data/gender_mena_dataset/{female,male}/*.jpg')
        sys.exit(1)

    # Load dataset
    logger.info('[finetune_gender_mena.py] ▶ Loading dataset...')
    train_transform, val_transform = get_transforms()
    dataset = GenderMENADataset(DATA_DIR, transform=train_transform)

    if len(dataset) == 0:
        logger.error('[finetune_gender_mena.py] ▶ No images found in dataset')
        sys.exit(1)

    # Split dataset
    train_size = int(len(dataset) * (1 - CONFIG['test_split'] - CONFIG['val_split']))
    val_size = int(len(dataset) * CONFIG['val_split'])
    test_size = len(dataset) - train_size - val_size

    train_set, val_set, test_set = torch.utils.data.random_split(
        dataset, [train_size, val_size, test_size]
    )
    logger.info(f'[finetune_gender_mena.py] ▶ Split: train={train_size}, val={val_size}, test={test_size}')

    # Create data loaders
    train_loader = DataLoader(train_set, batch_size=CONFIG['batch_size'], shuffle=True, drop_last=True)
    val_loader = DataLoader(val_set, batch_size=CONFIG['batch_size'], shuffle=False)
    test_loader = DataLoader(test_set, batch_size=CONFIG['batch_size'], shuffle=False)

    # Create model
    model = create_model()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        [p for p in model.parameters() if p.requires_grad],
        lr=CONFIG['learning_rate'],
        weight_decay=CONFIG['weight_decay']
    )

    early_stop = EarlyStopping(patience=CONFIG['early_stopping_patience'])

    # Training history
    history = {
        'train_loss': [],
        'val_loss': [],
        'train_acc': [],
        'val_acc': [],
    }

    logger.info('[finetune_gender_mena.py] ▶ Starting training loop...')

    # Training epochs
    for epoch in range(CONFIG['num_epochs']):
        logger.info(f'[finetune_gender_mena.py] ▶ Epoch {epoch+1}/{CONFIG["num_epochs"]}')

        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, CONFIG['device'])
        val_loss, val_acc = validate(model, val_loader, criterion, CONFIG['device'])

        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_acc'].append(train_acc)
        history['val_acc'].append(val_acc)

        early_stop(val_loss)
        if early_stop.early_stop:
            logger.info('[finetune_gender_mena.py] ▶ Early stopping triggered')
            break

    # Save best model
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = OUTPUT_DIR / f'gender_model_mena_finetuned_{timestamp}.pth'
    torch.save(model.state_dict(), model_path)
    logger.info(f'[finetune_gender_mena.py] ▶ Model saved: {model_path}')

    # Save metrics
    metrics_path = LOGS_DIR / f'metrics_{timestamp}.json'
    with open(metrics_path, 'w') as f:
        json.dump(history, f, indent=2)
    logger.info(f'[finetune_gender_mena.py] ▶ Metrics saved: {metrics_path}')

    # Plot curves
    plot_path = LOGS_DIR / f'training_curves_{timestamp}.png'
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].plot(history['train_loss'], label='Train Loss')
    axes[0].plot(history['val_loss'], label='Val Loss')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Loss Curves')
    axes[0].legend()

    axes[1].plot(history['train_acc'], label='Train Acc')
    axes[1].plot(history['val_acc'], label='Val Acc')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy (%)')
    axes[1].set_title('Accuracy Curves')
    axes[1].legend()

    plt.tight_layout()
    plt.savefig(plot_path, dpi=100)
    logger.info(f'[finetune_gender_mena.py] ▶ Training curves saved: {plot_path}')

    # Test evaluation
    logger.info('[finetune_gender_mena.py] ▶ Evaluating on test set...')
    test_loss, test_acc = validate(model, test_loader, criterion, CONFIG['device'])
    logger.info(f'[finetune_gender_mena.py] ▶ Test Accuracy: {test_acc:.2f}%')

    logger.info('[finetune_gender_mena.py] ▶ Training complete')


if __name__ == '__main__':
    main()
