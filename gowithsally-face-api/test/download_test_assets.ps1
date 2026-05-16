# ============================================================
# GoWithSally Face API - Download Test Assets
# Run: .\test\download_test_assets.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$imgDir = Join-Path $baseDir "images"
$audioDir = Join-Path $baseDir "audio"

# Create directories
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

# Remove old synthetic PNGs
Get-ChildItem -Path $imgDir -Filter "*.png" | Remove-Item -Force

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Downloading Test Assets for Face API" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ============================================================
# IMAGES - Free-to-use portraits from randomuser.me (CC BY-NC)
# ============================================================
Write-Host "`n--- FACE IMAGES ---" -ForegroundColor Yellow

$images = @{
    # Women
    "woman_young_1.jpg"     = "https://randomuser.me/api/portraits/women/44.jpg"
    "woman_young_2.jpg"     = "https://randomuser.me/api/portraits/women/68.jpg"
    "woman_old_1.jpg"       = "https://randomuser.me/api/portraits/women/81.jpg"
    "woman_old_2.jpg"       = "https://randomuser.me/api/portraits/women/79.jpg"

    # Men
    "man_young_1.jpg"       = "https://randomuser.me/api/portraits/men/32.jpg"
    "man_young_2.jpg"       = "https://randomuser.me/api/portraits/men/75.jpg"
    "man_old_1.jpg"         = "https://randomuser.me/api/portraits/men/83.jpg"
    "man_old_2.jpg"         = "https://randomuser.me/api/portraits/men/77.jpg"

    # Same person (same ID = same face)
    "same_person_photo1.jpg" = "https://randomuser.me/api/portraits/men/55.jpg"
    "same_person_photo2.jpg" = "https://randomuser.me/api/portraits/men/55.jpg"

    # Different people for comparison
    "compare_person_A.jpg"  = "https://randomuser.me/api/portraits/women/63.jpg"
    "compare_person_B.jpg"  = "https://randomuser.me/api/portraits/men/71.jpg"

    # Thumbnails (small faces)
    "small_face_thumb.jpg"  = "https://randomuser.me/api/portraits/thumb/women/50.jpg"

    # LEGO (non-human face for anti-spoof test)
    "fake_face_lego.jpg"    = "https://randomuser.me/api/portraits/lego/1.jpg"
}

foreach ($item in $images.GetEnumerator()) {
    $path = Join-Path $imgDir $item.Key
    try {
        Invoke-WebRequest -Uri $item.Value -OutFile $path -TimeoutSec 15
        $size = (Get-Item $path).Length / 1KB
        Write-Host "  OK: $($item.Key) ($([math]::Round($size)) KB)" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL: $($item.Key) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ============================================================
# Generate special test images via Docker (blur, no face, group)
# ============================================================
Write-Host "`n--- GENERATING SPECIAL IMAGES (via Docker) ---" -ForegroundColor Yellow

$genScript = @'
import sys, os
sys.path.insert(0, '/app')
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

img_dir = "/app/test/images"
os.makedirs(img_dir, exist_ok=True)

# 1. Blurry face: load an existing image and blur it
try:
    src = None
    for f in ["woman_young_1.jpg", "man_young_1.jpg"]:
        p = os.path.join(img_dir, f)
        if os.path.exists(p):
            src = Image.open(p)
            break
    if src:
        blurred = src.filter(ImageFilter.GaussianBlur(radius=8))
        blurred.save(os.path.join(img_dir, "blurry_face.jpg"), quality=50)
        print("  OK: blurry_face.jpg")

        # Very blurry
        very_blurred = src.filter(ImageFilter.GaussianBlur(radius=20))
        very_blurred.save(os.path.join(img_dir, "very_blurry_face.jpg"), quality=30)
        print("  OK: very_blurry_face.jpg")

        # Dark image (underexposed)
        dark = src.point(lambda p: int(p * 0.2))
        dark.save(os.path.join(img_dir, "dark_face.jpg"), quality=80)
        print("  OK: dark_face.jpg")

        # Overexposed
        bright = src.point(lambda p: min(255, int(p * 2.5)))
        bright.save(os.path.join(img_dir, "bright_face.jpg"), quality=80)
        print("  OK: bright_face.jpg")

        # Rotated 90 degrees
        rotated = src.rotate(90, expand=True)
        rotated.save(os.path.join(img_dir, "rotated_face.jpg"), quality=80)
        print("  OK: rotated_face.jpg")
except Exception as e:
    print(f"  WARN: Could not generate variants: {e}")

# 2. No face image (pure landscape)
img = Image.new("RGB", (400, 300), (100, 180, 80))
draw = ImageDraw.Draw(img)
# Draw sky
for y in range(150):
    r = 100 + y
    g = 150 + y // 2
    b = 220
    draw.line([(0, y), (400, y)], fill=(min(r,255), min(g,255), b))
# Draw sun
draw.ellipse([300, 30, 360, 90], fill=(255, 230, 50))
# Draw tree
draw.rectangle([180, 150, 200, 250], fill=(80, 50, 20))
draw.ellipse([150, 100, 230, 180], fill=(30, 120, 30))
img.save(os.path.join(img_dir, "no_face_landscape.jpg"), quality=90)
print("  OK: no_face_landscape.jpg")

# 3. Multiple faces (grid of existing faces)
faces = []
for f in ["woman_young_1.jpg", "man_young_1.jpg", "woman_old_1.jpg", "man_old_1.jpg"]:
    p = os.path.join(img_dir, f)
    if os.path.exists(p):
        faces.append(Image.open(p).resize((128, 128)))
if len(faces) >= 4:
    grid = Image.new("RGB", (256, 256))
    grid.paste(faces[0], (0, 0))
    grid.paste(faces[1], (128, 0))
    grid.paste(faces[2], (0, 128))
    grid.paste(faces[3], (128, 128))
    grid.save(os.path.join(img_dir, "group_4_faces.jpg"), quality=85)
    print("  OK: group_4_faces.jpg")

    # 2 faces side by side
    duo = Image.new("RGB", (256, 128))
    duo.paste(faces[0], (0, 0))
    duo.paste(faces[1], (128, 0))
    duo.save(os.path.join(img_dir, "group_2_faces.jpg"), quality=85)
    print("  OK: group_2_faces.jpg")

# 4. Screen/printed face (anti-spoof: photo of phone screen)
try:
    src = None
    for f in ["man_young_1.jpg"]:
        p = os.path.join(img_dir, f)
        if os.path.exists(p):
            src = Image.open(p)
            break
    if src:
        # Add "screen" frame effect
        screen = Image.new("RGB", (300, 400), (30, 30, 30))
        face_resized = src.resize((240, 320))
        screen.paste(face_resized, (30, 40))
        draw = ImageDraw.Draw(screen)
        # Add moire pattern (screen texture)
        for y in range(0, 400, 3):
            draw.line([(0, y), (300, y)], fill=(35, 35, 35), width=1)
        screen.save(os.path.join(img_dir, "spoof_screen_photo.jpg"), quality=70)
        print("  OK: spoof_screen_photo.jpg")
except Exception as e:
    print(f"  WARN: Could not generate spoof image: {e}")

# 5. Very small image
tiny = Image.new("RGB", (20, 20), (200, 180, 160))
tiny.save(os.path.join(img_dir, "tiny_20x20.jpg"), quality=50)
print("  OK: tiny_20x20.jpg")

# 6. Large image
large = Image.new("RGB", (4000, 3000), (200, 200, 200))
if faces:
    f = faces[0].resize((800, 800))
    large.paste(f, (1600, 1100))
large.save(os.path.join(img_dir, "large_4000x3000.jpg"), quality=85)
print("  OK: large_4000x3000.jpg")

# List all images
all_imgs = sorted([f for f in os.listdir(img_dir) if f.endswith(('.jpg','.png'))])
print(f"\nTotal test images: {len(all_imgs)}")
for f in all_imgs:
    s = os.path.getsize(os.path.join(img_dir, f)) / 1024
    print(f"  {f} ({s:.0f} KB)")
'@

$genScript | docker exec -i gws-face-api python -c "import sys; exec(sys.stdin.read())"

# ============================================================
# AUDIO - Generate test tones via Docker (sine wave)
# ============================================================
Write-Host "`n--- GENERATING TEST AUDIO ---" -ForegroundColor Yellow

$audioScript = @'
import numpy as np
import struct, os

audio_dir = "/app/test/audio"
os.makedirs(audio_dir, exist_ok=True)

def write_wav(filename, samples, sample_rate=16000):
    """Write a WAV file from numpy float array"""
    samples = np.clip(samples, -1.0, 1.0)
    int_samples = (samples * 32767).astype(np.int16)
    raw = int_samples.tobytes()
    nchannels = 1
    sampwidth = 2
    nframes = len(int_samples)
    with open(filename, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(raw)))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, nchannels, sample_rate,
                            sample_rate * nchannels * sampwidth, nchannels * sampwidth, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(raw)))
        f.write(raw)
    return os.path.getsize(filename)

sr = 16000
duration = 3  # seconds
t = np.linspace(0, duration, sr * duration, endpoint=False)

# Male voice simulation: low fundamental (120Hz) + harmonics
male = (0.5 * np.sin(2*np.pi*120*t) +
        0.3 * np.sin(2*np.pi*240*t) +
        0.15 * np.sin(2*np.pi*360*t) +
        0.05 * np.random.randn(len(t)))
# Add amplitude envelope
env = np.ones(len(t))
env[:sr//4] = np.linspace(0, 1, sr//4)
env[-sr//4:] = np.linspace(1, 0, sr//4)
male *= env
s = write_wav(os.path.join(audio_dir, "male_voice_low.wav"), male, sr)
print(f"  OK: male_voice_low.wav ({s/1024:.0f} KB)")

# Female voice simulation: higher fundamental (220Hz) + harmonics
female = (0.5 * np.sin(2*np.pi*220*t) +
          0.3 * np.sin(2*np.pi*440*t) +
          0.1 * np.sin(2*np.pi*660*t) +
          0.05 * np.random.randn(len(t)))
female *= env
s = write_wav(os.path.join(audio_dir, "female_voice_high.wav"), female, sr)
print(f"  OK: female_voice_high.wav ({s/1024:.0f} KB)")

# Silent audio (edge case)
silence = np.zeros(sr * 2)
s = write_wav(os.path.join(audio_dir, "silence.wav"), silence, sr)
print(f"  OK: silence.wav ({s/1024:.0f} KB)")

# Very short audio (0.5s)
short_t = np.linspace(0, 0.5, sr // 2, endpoint=False)
short = 0.5 * np.sin(2*np.pi*180*short_t)
s = write_wav(os.path.join(audio_dir, "short_half_second.wav"), short, sr)
print(f"  OK: short_half_second.wav ({s/1024:.0f} KB)")

# Noisy audio
noisy = 0.3 * np.sin(2*np.pi*150*t) + 0.7 * np.random.randn(len(t))
noisy *= env
s = write_wav(os.path.join(audio_dir, "noisy_voice.wav"), noisy, sr)
print(f"  OK: noisy_voice.wav ({s/1024:.0f} KB)")

# Check existing MP3 test files
for f in ["female_song.mp3", "male_song.mp3"]:
    p = os.path.join("/app/test", f)
    if os.path.exists(p):
        s = os.path.getsize(p) / 1024
        print(f"  EXISTS: {f} ({s:.0f} KB)")

print("\nAll audio files ready.")
'@

$audioScript | docker exec -i gws-face-api python -c "import sys; exec(sys.stdin.read())"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " Download Complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Run tests: docker exec gws-face-api python /app/test/run_all_tests.py"
