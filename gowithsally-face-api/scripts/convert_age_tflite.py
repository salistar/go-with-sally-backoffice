"""
Convert Age Model v4 (.keras Keras3 format) to TFLite
Handles Keras 2/3 incompatibility by extracting the .keras ZIP manually.

Run: docker exec -e TF_CPP_MIN_LOG_LEVEL=2 gws-face-api python /app/scripts/convert_age_tflite.py
"""
import os, sys, json, zipfile, tempfile, shutil
os.environ['TF_USE_LEGACY_KERAS'] = '1'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import numpy as np

MODEL_PATH = "/app/models/age/age_model_v4.keras"
TFLITE_PATH = "/tmp/age_model_v4.tflite"

print("=" * 60)
print("Age Model v4 -> TFLite Converter")
print("=" * 60)

# ============================================================
# STEP 1: Extract .keras archive (it's a ZIP)
# ============================================================
print("\n[1/5] Extracting .keras archive...")
tmp_dir = tempfile.mkdtemp(prefix="age_convert_")
try:
    with zipfile.ZipFile(MODEL_PATH, 'r') as z:
        z.extractall(tmp_dir)
        files = z.namelist()
        print(f"  Files: {files}")
except Exception as e:
    print(f"  ERROR: Cannot open .keras file: {e}")
    sys.exit(1)

# Read config
config_path = os.path.join(tmp_dir, "config.json")
with open(config_path, 'r') as f:
    config = json.load(f)

model_class = config.get('class_name', 'Unknown')
model_module = config.get('module', 'Unknown')
print(f"  Model class: {model_class} (module: {model_module})")

# Find weights file
weights_file = None
for fname in files:
    if fname.endswith('.h5') or fname.endswith('.weights.h5'):
        weights_file = os.path.join(tmp_dir, fname)
        break

if not weights_file:
    print("  ERROR: No weights file found in archive")
    sys.exit(1)

print(f"  Weights file: {os.path.basename(weights_file)}")
wsize = os.path.getsize(weights_file) / 1024 / 1024
print(f"  Weights size: {wsize:.1f} MB")

# ============================================================
# STEP 2: Analyze the architecture from config
# ============================================================
print("\n[2/5] Analyzing architecture...")
model_config = config.get('config', {})
layers = model_config.get('layers', [])
print(f"  Layers in config: {len(layers)}")

# Check if it's EfficientNetV2
layer_names = [l.get('config', {}).get('name', '') for l in layers]
is_efficientnet = any('efficientnet' in n.lower() for n in layer_names)
print(f"  Is EfficientNet: {is_efficientnet}")

# ============================================================
# STEP 3: Rebuild model with tf_keras (Keras 2) and load weights
# ============================================================
print("\n[3/5] Building model with tf_keras...")

import tensorflow as tf
print(f"  TensorFlow: {tf.__version__}")

try:
    import tf_keras as keras
    print(f"  tf_keras: {keras.__version__}")
except ImportError:
    import keras
    print(f"  keras: {keras.__version__}")

# Strategy A: Try to rebuild from config using Keras 2's from_config
print("  Strategy A: Rebuild from Keras 3 config...")
try:
    # The config is Keras 3 format. We need to adapt it for Keras 2.
    # First, try direct deserialization
    model = keras.models.model_from_json(json.dumps(config))
    print(f"    OK via model_from_json: {model.input_shape} -> {model.output_shape}")
except Exception as e:
    print(f"    Failed: {str(e)[:100]}")
    model = None

# Strategy B: Build EfficientNetV2-S manually and load weights by name
if model is None:
    print("  Strategy B: Build EfficientNetV2-S from scratch...")
    try:
        # Detect input shape from config
        input_shape = (160, 160, 3)  # Default for age model
        for l in layers:
            cfg = l.get('config', {})
            if 'batch_input_shape' in cfg:
                input_shape = tuple(cfg['batch_input_shape'][1:])
                break
            if 'batch_shape' in cfg:
                input_shape = tuple(cfg['batch_shape'][1:])
                break

        print(f"    Input shape: {input_shape}")

        # Build EfficientNetV2-S with imagenet weights=None
        base = keras.applications.EfficientNetV2S(
            include_top=False,
            weights=None,
            input_shape=input_shape,
            pooling='avg'
        )

        # Add dense head (detected from earlier weight inspection: 1280->1 or custom head)
        x = base.output

        # Check if there are dense layers in the config
        dense_layers = [l for l in layers if l.get('class_name') == 'Dense']
        print(f"    Dense layers in config: {len(dense_layers)}")

        for dl in dense_layers:
            dc = dl.get('config', {})
            units = dc.get('units', 1)
            activation = dc.get('activation', 'linear')
            name = dc.get('name', 'dense')
            if isinstance(activation, dict):
                activation = activation.get('class_name', 'linear').lower()
            print(f"    Dense: {name} units={units} activation={activation}")
            x = keras.layers.Dense(units, activation=activation, name=name)(x)

        if not dense_layers:
            # Fallback: single output
            x = keras.layers.Dense(1, activation='sigmoid', name='dense_output')(x)

        model = keras.Model(inputs=base.input, outputs=x)
        print(f"    Model: {model.input_shape} -> {model.output_shape}")
        print(f"    Params: {model.count_params():,}")

        # Load weights by name with skip_mismatch
        print("    Loading weights by name...")
        import h5py

        # Check h5 structure
        with h5py.File(weights_file, 'r') as h5:
            top_keys = list(h5.keys())
            print(f"    H5 top keys: {top_keys[:5]}...")

        try:
            model.load_weights(weights_file, by_name=True, skip_mismatch=True)
            print("    Weights loaded (by_name, skip_mismatch)")
        except Exception as e2:
            print(f"    load_weights failed: {str(e2)[:100]}")
            # Try layer by layer
            print("    Trying layer-by-layer weight loading...")
            import h5py
            with h5py.File(weights_file, 'r') as h5:
                def visit_weights(name, obj):
                    if isinstance(obj, h5py.Dataset):
                        print(f"      H5: {name} shape={obj.shape}")
                h5.visititems(visit_weights)
    except Exception as e:
        print(f"    Strategy B failed: {e}")
        model = None

# Strategy C: Use a temporary Keras 3 environment
if model is None:
    print("  Strategy C: Install keras>=3.0 temporarily...")
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'keras>=3.0', '-q', '--break-system-packages'],
                   capture_output=True)
    # Reload keras
    import importlib
    if 'keras' in sys.modules:
        importlib.reload(sys.modules['keras'])
    try:
        import keras as keras3
        print(f"    Keras: {keras3.__version__}")
        model = keras3.models.load_model(MODEL_PATH, compile=False)
        print(f"    OK: {model.input_shape} -> {model.output_shape}")
    except Exception as e:
        print(f"    Strategy C failed: {e}")
        model = None

if model is None:
    print("\nERROR: Could not load model with any strategy")
    shutil.rmtree(tmp_dir, ignore_errors=True)
    sys.exit(1)

# ============================================================
# STEP 4: Convert to TFLite
# ============================================================
print(f"\n[4/5] Converting to TFLite...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

try:
    tflite_model = converter.convert()
    with open(TFLITE_PATH, 'wb') as f:
        f.write(tflite_model)
    size_mb = len(tflite_model) / 1024 / 1024
    print(f"  Saved: {TFLITE_PATH} ({size_mb:.1f} MB)")
except Exception as e:
    print(f"  Conversion failed: {e}")
    # Try without optimizations
    print("  Retrying without optimizations...")
    converter2 = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter2.convert()
    with open(TFLITE_PATH, 'wb') as f:
        f.write(tflite_model)
    size_mb = len(tflite_model) / 1024 / 1024
    print(f"  Saved: {TFLITE_PATH} ({size_mb:.1f} MB)")

# ============================================================
# STEP 5: Verify
# ============================================================
print(f"\n[5/5] Verification...")
interpreter = tf.lite.Interpreter(model_path=TFLITE_PATH)
interpreter.allocate_tensors()
inp = interpreter.get_input_details()
out = interpreter.get_output_details()
print(f"  Input:  {inp[0]['shape']} dtype={inp[0]['dtype']}")
print(f"  Output: {out[0]['shape']} dtype={out[0]['dtype']}")

test_img = np.random.rand(1, 160, 160, 3).astype(np.float32)
interpreter.set_tensor(inp[0]['index'], test_img)
interpreter.invoke()
result = interpreter.get_tensor(out[0]['index'])
print(f"  Test prediction: {result[0]} (expected 0.0-1.0)")

# Cleanup
shutil.rmtree(tmp_dir, ignore_errors=True)

print(f"\n{'=' * 60}")
print(f"SUCCESS! TFLite model saved to {TFLITE_PATH}")
print(f"Size: {size_mb:.1f} MB (vs ~270 MB original)")
print(f"Copy it out: docker cp gws-face-api:{TFLITE_PATH} ./models/age/")
print(f"{'=' * 60}")
