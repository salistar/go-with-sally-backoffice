#!/bin/bash
# ============================================================
# 📄 download_datasets.sh — GoWithSally AI/ML
# LOG SUMMARY:
#   • echo '[download_datasets.sh] ▶ Script started'
# ============================================================
"""
Download Gender Classification Datasets
========================================
Download UTKFace and FairFace datasets for gender model training.

Expected to create:
  data/gender_mena_dataset/{female,male}/*.jpg
  data/gender_test_moroccan/{female,male}/*.jpg
"""

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${BASE_DIR}/data"
MODELS_DIR="${BASE_DIR}/models"

echo "[download_datasets.sh] ▶ Script started"
echo "[download_datasets.sh] ▶ Base directory: ${BASE_DIR}"

# Create data directory structure
mkdir -p "${DATA_DIR}/gender_mena_dataset/female"
mkdir -p "${DATA_DIR}/gender_mena_dataset/male"
mkdir -p "${DATA_DIR}/gender_test_moroccan/female"
mkdir -p "${DATA_DIR}/gender_test_moroccan/male"

echo "[download_datasets.sh] ▶ Data directories created"

# ============================================================
# UTKFace Dataset Download
# ============================================================
echo "[download_datasets.sh] ▶ Downloading UTKFace dataset..."
UTKFACE_URL="https://drive.google.com/uc?id=0BxYys69jI14kU0I1YUQyY1ZDRUE"
UTKFACE_ZIP="${DATA_DIR}/UTKFace.zip"

# Note: Requires gdown for Google Drive downloads
if command -v gdown &> /dev/null; then
    echo "[download_datasets.sh] ▶ Using gdown for UTKFace"
    gdown "https://drive.google.com/uc?id=0BxYys69jI14kU0I1YUQyY1ZDRUE" -O "${UTKFACE_ZIP}" || {
        echo "[download_datasets.sh] ▶ WARNING: UTKFace download failed (expected)"
        echo "[download_datasets.sh] ▶ Install gdown: pip install gdown"
    }
else
    echo "[download_datasets.sh] ▶ gdown not found. Install: pip install gdown"
    echo "[download_datasets.sh] ▶ Then manually download UTKFace from:"
    echo "[download_datasets.sh] ▶   https://susanqq.github.io/UTK Face/"
fi

# ============================================================
# FairFace Dataset Download (alternative)
# ============================================================
echo "[download_datasets.sh] ▶ Downloading FairFace dataset..."
FAIRFACE_URL="https://drive.google.com/uc?id=1Z1RR40XWalohwIRLbVlrp26ZxcxrysCV"

if command -v gdown &> /dev/null; then
    echo "[download_datasets.sh] ▶ Using gdown for FairFace"
    gdown "${FAIRFACE_URL}" -O "${DATA_DIR}/fairface.zip" || {
        echo "[download_datasets.sh] ▶ WARNING: FairFace download failed (expected)"
    }
else
    echo "[download_datasets.sh] ▶ Install gdown to download FairFace: pip install gdown"
fi

# ============================================================
# Extract and organize datasets
# ============================================================
echo "[download_datasets.sh] ▶ Organizing dataset structure..."

# Extract UTKFace if downloaded
if [ -f "${UTKFACE_ZIP}" ]; then
    echo "[download_datasets.sh] ▶ Extracting UTKFace..."
    unzip -q "${UTKFACE_ZIP}" -d "${DATA_DIR}/utkface_extracted/" || true

    # Process images: separate by gender
    # Format: [age]_[gender]_[race]_[date&time].jpg
    # Gender: 0=Male, 1=Female
    echo "[download_datasets.sh] ▶ Processing UTKFace images..."
    for file in "${DATA_DIR}"/utkface_extracted/UTKFace/*.jpg; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            gender=$(echo "$filename" | cut -d'_' -f2)

            if [ "$gender" = "0" ]; then
                cp "$file" "${DATA_DIR}/gender_mena_dataset/male/" 2>/dev/null || true
            elif [ "$gender" = "1" ]; then
                cp "$file" "${DATA_DIR}/gender_mena_dataset/female/" 2>/dev/null || true
            fi
        fi
    done

    rm -rf "${DATA_DIR}/utkface_extracted"
    echo "[download_datasets.sh] ▶ UTKFace processed"
fi

# ============================================================
# Setup statistics
# ============================================================
echo "[download_datasets.sh] ▶ Dataset statistics:"
FEMALE_COUNT=$(find "${DATA_DIR}/gender_mena_dataset/female" -name "*.jpg" | wc -l)
MALE_COUNT=$(find "${DATA_DIR}/gender_mena_dataset/male" -name "*.jpg" | wc -l)
echo "[download_datasets.sh] ▶ Training dataset - Female: $FEMALE_COUNT, Male: $MALE_COUNT"

TEST_FEMALE=$(find "${DATA_DIR}/gender_test_moroccan/female" -name "*.jpg" | wc -l)
TEST_MALE=$(find "${DATA_DIR}/gender_test_moroccan/male" -name "*.jpg" | wc -l)
echo "[download_datasets.sh] ▶ Test dataset - Female: $TEST_FEMALE, Male: $TEST_MALE"

# ============================================================
# Setup instructions
# ============================================================
echo "[download_datasets.sh] ▶ =========================================="
echo "[download_datasets.sh] ▶ SETUP INSTRUCTIONS"
echo "[download_datasets.sh] ▶ =========================================="
echo "[download_datasets.sh] ▶ 1. Install gdown for Google Drive access:"
echo "[download_datasets.sh] ▶    pip install gdown"
echo "[download_datasets.sh] ▶"
echo "[download_datasets.sh] ▶ 2. Download datasets:"
echo "[download_datasets.sh] ▶    - UTKFace: https://susanqq.github.io/UTKFace/"
echo "[download_datasets.sh] ▶    - FairFace: https://github.com/dchen236/FairFace"
echo "[download_datasets.sh] ▶"
echo "[download_datasets.sh] ▶ 3. Place images in:"
echo "[download_datasets.sh] ▶    data/gender_mena_dataset/{female,male}/"
echo "[download_datasets.sh] ▶    data/gender_test_moroccan/{female,male}/"
echo "[download_datasets.sh] ▶"
echo "[download_datasets.sh] ▶ 4. Run fine-tuning:"
echo "[download_datasets.sh] ▶    python scripts/finetune_gender_mena.py"
echo "[download_datasets.sh] ▶"
echo "[download_datasets.sh] ▶ 5. Evaluate model:"
echo "[download_datasets.sh] ▶    python scripts/evaluate_gender.py"
echo "[download_datasets.sh] ▶ =========================================="

echo "[download_datasets.sh] ▶ Script complete"
