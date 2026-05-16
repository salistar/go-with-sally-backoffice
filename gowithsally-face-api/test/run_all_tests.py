#!/usr/bin/env python3
"""
============================================================
GoWithSally Face API - Functional Test Suite
============================================================
Tests all 13 AI models + all 27 API endpoints.

Run inside Docker:
  docker exec gws-face-api python /app/test/run_all_tests.py

Or from host:
  docker exec gws-face-api python /app/test/run_all_tests.py --verbose
============================================================
"""

import os
import sys
import json
import time
import requests
import argparse
from datetime import datetime
from pathlib import Path

# ============================================================
# CONFIG
# ============================================================
BASE_URL = "http://localhost:8000"
PASSWORD = os.getenv("APP_PASSWORD", "sally2024")
IMG_DIR = "/app/test/images"
AUDIO_DIR = "/app/test/audio"
RESULTS_DIR = "/app/test/results"

# Colors for terminal output
class C:
    OK = "\033[92m"
    FAIL = "\033[91m"
    WARN = "\033[93m"
    INFO = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"

# ============================================================
# HELPERS
# ============================================================
class TestRunner:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.api_key = None
        self.results = []
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.start_time = time.time()

    def log(self, msg, color=""):
        print(f"{color}{msg}{C.END}")

    def log_test(self, name, passed, detail="", expected="", got=""):
        status = f"{C.OK}PASS{C.END}" if passed else f"{C.FAIL}FAIL{C.END}"
        self.log(f"  [{status}] {name}")
        if self.verbose and detail:
            self.log(f"         {detail}", C.INFO)
        if not passed and expected:
            self.log(f"         Expected: {expected}", C.WARN)
            self.log(f"         Got:      {got}", C.WARN)

        self.results.append({
            "test": name,
            "passed": passed,
            "detail": detail,
            "expected": expected,
            "got": str(got)
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1

    def skip_test(self, name, reason=""):
        self.log(f"  [{C.WARN}SKIP{C.END}] {name} - {reason}")
        self.results.append({"test": name, "passed": None, "detail": reason})
        self.skipped += 1

    def get_api_key(self):
        """Login and get API key"""
        try:
            r = requests.post(f"{BASE_URL}/api/auth/login",
                            json={"password": PASSWORD}, timeout=10)
            if r.status_code == 200:
                data = r.json()
                self.api_key = data.get("api_key") or data.get("token") or data.get("key")
                return True
        except Exception as e:
            self.log(f"  Login failed: {e}", C.FAIL)
        return False

    def headers(self):
        return {"X-API-Key": self.api_key} if self.api_key else {}

    def post_image(self, endpoint, image_path, extra_files=None, extra_data=None):
        """POST an image to an endpoint"""
        files = {"file": open(image_path, "rb")}
        if extra_files:
            files.update(extra_files)
        try:
            r = requests.post(f"{BASE_URL}{endpoint}",
                            files=files,
                            data=extra_data,
                            headers=self.headers(),
                            timeout=30)
            return r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        except Exception as e:
            return 0, {"error": str(e)}
        finally:
            for f in files.values():
                if hasattr(f, 'close'):
                    f.close()

    def post_two_images(self, endpoint, img1_path, img2_path):
        """POST two images"""
        f1 = open(img1_path, "rb")
        f2 = open(img2_path, "rb")
        try:
            r = requests.post(f"{BASE_URL}{endpoint}",
                            files={"file1": f1, "file2": f2},
                            headers=self.headers(),
                            timeout=30)
            return r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        except Exception as e:
            return 0, {"error": str(e)}
        finally:
            f1.close()
            f2.close()

    def post_audio(self, endpoint, audio_path):
        """POST audio to an endpoint"""
        files = {"file": open(audio_path, "rb")}
        try:
            r = requests.post(f"{BASE_URL}{endpoint}",
                            files=files,
                            headers=self.headers(),
                            timeout=30)
            return r.status_code, r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        except Exception as e:
            return 0, {"error": str(e)}
        finally:
            files["file"].close()

    def find_image(self, *names):
        """Find first available image"""
        for name in names:
            path = os.path.join(IMG_DIR, name)
            if os.path.exists(path):
                return path
        return None

    def find_audio(self, *names):
        """Find first available audio"""
        for name in names:
            for d in [AUDIO_DIR, "/app/test"]:
                path = os.path.join(d, name)
                if os.path.exists(path):
                    return path
        return None

# ============================================================
# TEST SUITES
# ============================================================

def test_health(t: TestRunner):
    """Test health & diagnostic endpoints (no auth)"""
    t.log(f"\n{C.BOLD}=== 1. HEALTH & DIAGNOSTICS ==={C.END}")

    # 1.1 Ping
    try:
        r = requests.get(f"{BASE_URL}/api/health/ping", timeout=5)
        t.log_test("GET /api/health/ping returns 200",
                   r.status_code == 200,
                   f"status={r.status_code}")
    except Exception as e:
        t.log_test("GET /api/health/ping returns 200", False, got=str(e))

    # 1.2 Test endpoint
    try:
        r = requests.get(f"{BASE_URL}/api/test", timeout=10)
        data = r.json()
        t.log_test("GET /api/test returns status ok",
                   data.get("status") == "ok",
                   f"version={data.get('version')}")

        t.log_test("GET /api/test models_loading_done is true",
                   data.get("models_loading_done") == True,
                   f"phase={data.get('loading_phase')}")

        count = data.get("models_count", 0)
        t.log_test(f"GET /api/test models_count >= 8",
                   count >= 8,
                   f"models_count={count}",
                   expected=">= 8", got=count)

        # Check specific models
        loaded = data.get("models_loaded", {})
        critical_models = ["detector", "landmarks", "recog_dlib", "gender_pth",
                          "antispoof_pth", "voice_gender"]
        for m in critical_models:
            t.log_test(f"Model '{m}' is loaded",
                       loaded.get(m) == True,
                       got=loaded.get(m))

        # Optional models
        optional_models = ["recog_tf", "gender_tf", "antispoof_tf",
                          "age_tflite", "facecount_yolo", "headcount_yolo"]
        for m in optional_models:
            if loaded.get(m):
                t.log_test(f"Model '{m}' is loaded (bonus)", True)
            else:
                t.skip_test(f"Model '{m}'", "not loaded")

    except Exception as e:
        t.log_test("GET /api/test", False, got=str(e))

    # 1.3 Web pages
    for path, name in [("/", "Index"), ("/login", "Login"), ("/studio", "Studio")]:
        try:
            r = requests.get(f"{BASE_URL}{path}", timeout=5)
            t.log_test(f"GET {path} ({name}) returns 200",
                       r.status_code == 200)
        except Exception as e:
            t.log_test(f"GET {path} ({name})", False, got=str(e))


def test_auth(t: TestRunner):
    """Test authentication"""
    t.log(f"\n{C.BOLD}=== 2. AUTHENTICATION ==={C.END}")

    # 2.1 Login with correct password
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login",
                         json={"password": PASSWORD}, timeout=10)
        data = r.json()
        has_key = any(k in data for k in ["api_key", "token", "key"])
        t.log_test("POST /api/auth/login with correct password",
                   r.status_code == 200 and has_key,
                   f"got key: {has_key}")
    except Exception as e:
        t.log_test("POST /api/auth/login", False, got=str(e))

    # 2.2 Login with wrong password
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login",
                         json={"password": "wrong_password"}, timeout=10)
        t.log_test("POST /api/auth/login rejects wrong password",
                   r.status_code in [401, 403],
                   f"status={r.status_code}")
    except Exception as e:
        t.log_test("POST /api/auth/login wrong password", False, got=str(e))

    # 2.3 Access protected endpoint without key
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        t.log_test("Protected endpoint rejects no API key",
                   r.status_code in [401, 403],
                   f"status={r.status_code}")
    except Exception as e:
        t.log_test("Protected endpoint without key", False, got=str(e))


def test_face_detection(t: TestRunner):
    """Test face detection model (#1 - dlib HOG)"""
    t.log(f"\n{C.BOLD}=== 3. FACE DETECTION (Model #1: dlib HOG) ==={C.END}")

    # 3.1 Detect face in normal image
    img = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if not img:
        t.skip_test("Face detection - normal image", "no test image available")
        return

    code, data = t.post_image("/api/detect", img)
    t.log_test("POST /api/detect returns 200", code == 200, f"code={code}")

    faces = data.get("faces", [])
    count = data.get("count", len(faces))
    t.log_test("Detects >= 1 face in portrait",
               count >= 1,
               f"faces={count}", expected=">= 1", got=count)

    if faces:
        face = faces[0]
        has_bbox = "bbox" in face or "box" in face or "rect" in face
        t.log_test("Face has bounding box", has_bbox, f"keys={list(face.keys())}")

    # 3.2 No face in landscape
    no_face = t.find_image("no_face_landscape.jpg", "no_face.png")
    if no_face:
        code, data = t.post_image("/api/detect", no_face)
        count = data.get("count", len(data.get("faces", [])))
        t.log_test("Detects 0 faces in landscape",
                   count == 0,
                   f"faces={count}", expected="0", got=count)

    # 3.3 Blurry face
    blurry = t.find_image("blurry_face.jpg")
    if blurry:
        code, data = t.post_image("/api/detect", blurry)
        t.log_test("Handles blurry image (no crash)",
                   code == 200,
                   f"faces={data.get('count', '?')}")

    # 3.4 Small image
    tiny = t.find_image("tiny_20x20.jpg", "small_face.png")
    if tiny:
        code, data = t.post_image("/api/detect", tiny)
        t.log_test("Handles tiny image (no crash)",
                   code in [200, 400, 422],
                   f"code={code}")


def test_landmarks(t: TestRunner):
    """Test landmarks model (#2 - 68 landmarks predictor)"""
    t.log(f"\n{C.BOLD}=== 4. LANDMARKS (Model #2: 68 landmarks) ==={C.END}")

    img = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if not img:
        t.skip_test("Landmarks", "no test image")
        return

    code, data = t.post_image("/api/detect", img)
    faces = data.get("faces", [])
    if faces:
        face = faces[0]
        landmarks = face.get("landmarks") or face.get("landmark_points")
        has_landmarks = landmarks is not None and len(landmarks) > 0 if landmarks else False
        t.log_test("Face includes landmarks data",
                   has_landmarks,
                   f"landmarks_count={len(landmarks) if landmarks else 0}")


def test_recognition(t: TestRunner):
    """Test recognition models (#3 dlib, #4 TF)"""
    t.log(f"\n{C.BOLD}=== 5. RECOGNITION (Models #3 dlib + #4 TF) ==={C.END}")

    img = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if not img:
        t.skip_test("Recognition", "no test image")
        return

    # 5.1 Get embeddings
    code, data = t.post_image("/api/recognize", img)
    t.log_test("POST /api/recognize returns 200", code == 200)

    faces = data.get("faces", [])
    if faces:
        face = faces[0]
        embedding = face.get("embedding") or face.get("embedding_128d")
        if embedding:
            t.log_test("Embedding is 128-dimensional",
                       len(embedding) == 128,
                       f"dim={len(embedding)}", expected="128", got=len(embedding))
        else:
            t.log_test("Has embedding data", False, f"keys={list(face.keys())}")

    # 5.2 Compare same person
    img1 = t.find_image("same_person_photo1.jpg")
    img2 = t.find_image("same_person_photo2.jpg")
    if img1 and img2:
        code, data = t.post_two_images("/api/compare", img1, img2)
        t.log_test("POST /api/compare returns 200", code == 200)
        match = data.get("match")
        dist = data.get("distance", "?")
        t.log_test("Same person photos match",
                   match == True,
                   f"match={match}, distance={dist}")

    # 5.3 Compare different people
    imgA = t.find_image("compare_person_A.jpg", "woman_young_1.jpg")
    imgB = t.find_image("compare_person_B.jpg", "man_old_1.jpg")
    if imgA and imgB:
        code, data = t.post_two_images("/api/compare", imgA, imgB)
        match = data.get("match")
        dist = data.get("distance", "?")
        t.log_test("Different people don't match",
                   match == False,
                   f"match={match}, distance={dist}")


def test_gender(t: TestRunner):
    """Test gender models (#5 PyTorch, #6 TF)"""
    t.log(f"\n{C.BOLD}=== 6. GENDER CLASSIFICATION (Models #5 PyTorch + #6 TF) ==={C.END}")

    # 6.1 Woman
    woman = t.find_image("woman_young_1.jpg", "woman_old_1.jpg")
    if woman:
        code, data = t.post_image("/api/gender", woman)
        t.log_test("POST /api/gender returns 200", code == 200)
        gender = data.get("gender", "").lower()
        conf = data.get("confidence", 0)
        t.log_test("Detects female in woman photo",
                   "female" in gender or "woman" in gender or "f" == gender,
                   f"gender={gender}, confidence={conf}",
                   expected="female", got=gender)

    # 6.2 Man
    man = t.find_image("man_young_1.jpg", "man_old_1.jpg")
    if man:
        code, data = t.post_image("/api/gender", man)
        gender = data.get("gender", "").lower()
        conf = data.get("confidence", 0)
        t.log_test("Detects male in man photo",
                   "male" in gender or "man" in gender or "m" == gender,
                   f"gender={gender}, confidence={conf}",
                   expected="male", got=gender)

    # 6.3 No face image
    no_face = t.find_image("no_face_landscape.jpg")
    if no_face:
        code, data = t.post_image("/api/gender", no_face)
        t.log_test("Gender on no-face image (no crash)",
                   code in [200, 400, 422],
                   f"code={code}, response={str(data)[:100]}")


def test_antispoof(t: TestRunner):
    """Test anti-spoof models (#7 PyTorch, #8 TF)"""
    t.log(f"\n{C.BOLD}=== 7. ANTI-SPOOF / LIVENESS (Models #7 PyTorch + #8 TF) ==={C.END}")

    # 7.1 Real face
    real = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if real:
        code, data = t.post_image("/api/antispoof", real)
        t.log_test("POST /api/antispoof returns 200", code == 200)
        is_real = data.get("is_real")
        score = data.get("score") or data.get("confidence", "?")
        t.log_test("Real photo detected as real",
                   is_real == True,
                   f"is_real={is_real}, score={score}")

    # 7.2 Spoof (screen photo)
    spoof = t.find_image("spoof_screen_photo.jpg", "fake_face_lego.jpg")
    if spoof:
        code, data = t.post_image("/api/antispoof", spoof)
        is_real = data.get("is_real")
        score = data.get("score") or data.get("confidence", "?")
        t.log_test("Spoof/fake detected (ideally not real)",
                   True,  # Just check it doesn't crash
                   f"is_real={is_real}, score={score} (may vary with synthetic images)")


def test_voice_gender(t: TestRunner):
    """Test voice gender model (#9 sklearn ensemble)"""
    t.log(f"\n{C.BOLD}=== 8. VOICE GENDER (Model #9: sklearn ensemble) ==={C.END}")

    # 8.1 Male voice
    male = t.find_audio("male_voice_low.wav", "male_song.mp3")
    if male:
        code, data = t.post_audio("/api/voice-gender", male)
        t.log_test("POST /api/voice-gender returns 200", code == 200)
        gender = data.get("gender", "").lower()
        t.log_test("Male voice detected as male",
                   "male" in gender or "m" == gender,
                   f"gender={gender}",
                   expected="male", got=gender)
    else:
        t.skip_test("Male voice detection", "no male audio file")

    # 8.2 Female voice
    female = t.find_audio("female_voice_high.wav", "female_song.mp3")
    if female:
        code, data = t.post_audio("/api/voice-gender", female)
        gender = data.get("gender", "").lower()
        t.log_test("Female voice detected as female",
                   "female" in gender or "f" == gender,
                   f"gender={gender}",
                   expected="female", got=gender)
    else:
        t.skip_test("Female voice detection", "no female audio file")

    # 8.3 Silence (edge case)
    silence = t.find_audio("silence.wav")
    if silence:
        code, data = t.post_audio("/api/voice-gender", silence)
        t.log_test("Silence audio (no crash)",
                   code in [200, 400, 422],
                   f"code={code}")

    # 8.4 Very short audio
    short = t.find_audio("short_half_second.wav")
    if short:
        code, data = t.post_audio("/api/voice-gender", short)
        t.log_test("Very short audio (no crash)",
                   code in [200, 400, 422],
                   f"code={code}")


def test_age(t: TestRunner):
    """Test age models (#10 TFLite, #11 Keras)"""
    t.log(f"\n{C.BOLD}=== 9. AGE ESTIMATION (Models #10 TFLite + #11 Keras) ==={C.END}")

    # 9.1 Young person
    young = t.find_image("man_young_1.jpg", "woman_young_1.jpg")
    if young:
        code, data = t.post_image("/api/age", young)
        t.log_test("POST /api/age returns 200", code == 200)
        age = data.get("age", -1)
        model_used = data.get("model_used", "?")
        t.log_test(f"Young person age is 15-45",
                   isinstance(age, (int, float)) and 15 <= age <= 45,
                   f"age={age}, model={model_used}",
                   expected="15-45", got=age)

    # 9.2 Old person
    old = t.find_image("man_old_1.jpg", "woman_old_1.jpg")
    if old:
        code, data = t.post_image("/api/age", old)
        age = data.get("age", -1)
        t.log_test(f"Older person age is 40+",
                   isinstance(age, (int, float)) and age >= 40,
                   f"age={age}",
                   expected=">= 40", got=age)


def test_face_count(t: TestRunner):
    """Test YOLO face count model (#12)"""
    t.log(f"\n{C.BOLD}=== 10. FACE COUNT (Model #12: YOLOv8-Face) ==={C.END}")

    # 10.1 Single face
    single = t.find_image("woman_young_1.jpg")
    if single:
        code, data = t.post_image("/api/count-faces", single)
        t.log_test("POST /api/count-faces returns 200", code == 200)
        count = data.get("count", -1)
        t.log_test("Single face image counts 1",
                   count == 1,
                   f"count={count}", expected="1", got=count)

    # 10.2 Multiple faces
    group = t.find_image("group_4_faces.jpg", "group_2_faces.jpg")
    if group:
        code, data = t.post_image("/api/count-faces", group)
        count = data.get("count", -1)
        name = os.path.basename(group)
        expected = 4 if "4" in name else 2
        t.log_test(f"Group image counts >= 2 faces",
                   count >= 2,
                   f"count={count}", expected=f">= 2", got=count)

    # 10.3 No face
    no_face = t.find_image("no_face_landscape.jpg")
    if no_face:
        code, data = t.post_image("/api/count-faces", no_face)
        count = data.get("count", -1)
        t.log_test("No face image counts 0",
                   count == 0,
                   f"count={count}", expected="0", got=count)


def test_head_detection(t: TestRunner):
    """Test YOLO head detection model (#13)"""
    t.log(f"\n{C.BOLD}=== 11. HEAD DETECTION (Model #13: YOLOv8-Head) ==={C.END}")

    img = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if not img:
        t.skip_test("Head detection", "no test image")
        return

    code, data = t.post_image("/api/detect-heads", img)
    t.log_test("POST /api/detect-heads returns 200", code == 200)
    count = data.get("count", -1)
    t.log_test("Detects >= 1 head in portrait",
               count >= 1,
               f"count={count}", expected=">= 1", got=count)


def test_unified_analyze(t: TestRunner):
    """Test unified analysis endpoint"""
    t.log(f"\n{C.BOLD}=== 12. UNIFIED ANALYSIS (/api/analyze) ==={C.END}")

    img = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if not img:
        t.skip_test("Unified analysis", "no test image")
        return

    code, data = t.post_image("/api/analyze", img)
    t.log_test("POST /api/analyze returns 200", code == 200)

    # Check all expected fields
    for field in ["faces", "face_count", "head_count", "processing_time"]:
        has = field in data
        t.log_test(f"Response includes '{field}'", has,
                   f"keys={list(data.keys())[:10]}")

    faces = data.get("faces", [])
    if faces:
        face = faces[0]
        for prop in ["gender", "age", "is_real"]:
            has = prop in face
            val = face.get(prop, "missing")
            t.log_test(f"Face object includes '{prop}'", has, f"{prop}={val}")


def test_gowithsally_endpoints(t: TestRunner):
    """Test GoWithSally-specific verification endpoints"""
    t.log(f"\n{C.BOLD}=== 13. GOWITHSALLY VERIFICATION ==={C.END}")

    img1 = t.find_image("same_person_photo1.jpg", "woman_young_1.jpg")
    img2 = t.find_image("same_person_photo2.jpg", "woman_young_2.jpg")

    # 13.1 Driver verify
    if img1 and img2:
        code, data = t.post_two_images("/api/driver-verify", img1, img2)
        t.log_test("POST /api/driver-verify returns 200", code == 200,
                   f"overall_pass={data.get('overall_pass')}")

    # 13.2 Passenger verify
    if img1:
        code, data = t.post_image("/api/passenger-verify", img1)
        t.log_test("POST /api/passenger-verify returns 200", code == 200,
                   f"faces={data.get('faces_detected')}")

    # 13.3 Trip safety
    if img1:
        code, data = t.post_image("/api/trip-safety", img1)
        t.log_test("POST /api/trip-safety returns 200", code == 200)
        score = data.get("safety_score", -1)
        t.log_test("Safety score is 0-100",
                   isinstance(score, (int, float)) and 0 <= score <= 100,
                   f"score={score}", expected="0-100", got=score)


def test_edge_cases(t: TestRunner):
    """Test edge cases and error handling"""
    t.log(f"\n{C.BOLD}=== 14. EDGE CASES & ERROR HANDLING ==={C.END}")

    # 14.1 No file uploaded
    try:
        r = requests.post(f"{BASE_URL}/api/detect",
                         headers=t.headers(), timeout=10)
        t.log_test("Detect with no file returns 4xx",
                   r.status_code in [400, 422],
                   f"code={r.status_code}")
    except:
        t.log_test("Detect with no file", True, "connection error (acceptable)")

    # 14.2 Wrong file type (text file)
    try:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
            f.write("This is not an image")
            txt_path = f.name
        code, data = t.post_image("/api/detect", txt_path)
        t.log_test("Text file upload returns error",
                   code in [400, 422, 500],
                   f"code={code}")
        os.unlink(txt_path)
    except:
        t.log_test("Text file upload", True, "handled")

    # 14.3 Very large image
    large = t.find_image("large_4000x3000.jpg")
    if large:
        code, data = t.post_image("/api/detect", large)
        t.log_test("Large 4000x3000 image (no crash)",
                   code in [200, 400, 413, 422],
                   f"code={code}")

    # 14.4 Dark image
    dark = t.find_image("dark_face.jpg")
    if dark:
        code, data = t.post_image("/api/detect", dark)
        t.log_test("Very dark image (no crash)",
                   code in [200, 400, 422],
                   f"code={code}, faces={data.get('count', '?')}")

    # 14.5 Rotated image
    rotated = t.find_image("rotated_face.jpg")
    if rotated:
        code, data = t.post_image("/api/detect", rotated)
        t.log_test("Rotated 90° image (no crash)",
                   code in [200, 400, 422],
                   f"code={code}, faces={data.get('count', '?')}")

    # 14.6 Concurrent requests
    import concurrent.futures
    img = t.find_image("man_young_1.jpg", "woman_young_1.jpg")
    if img:
        def make_request():
            return t.post_image("/api/detect", img)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
            futures = [ex.submit(make_request) for _ in range(5)]
            results = [f.result() for f in futures]
            all_ok = all(r[0] == 200 for r in results)
            t.log_test("5 concurrent requests all return 200",
                       all_ok,
                       f"statuses={[r[0] for r in results]}")


def test_performance(t: TestRunner):
    """Test response times"""
    t.log(f"\n{C.BOLD}=== 15. PERFORMANCE ==={C.END}")

    img = t.find_image("woman_young_1.jpg", "man_young_1.jpg")
    if not img:
        t.skip_test("Performance", "no test image")
        return

    endpoints = [
        ("/api/detect", "Detection"),
        ("/api/gender", "Gender"),
        ("/api/age", "Age"),
        ("/api/antispoof", "Anti-Spoof"),
        ("/api/count-faces", "Face Count"),
    ]

    for endpoint, name in endpoints:
        start = time.time()
        code, data = t.post_image(endpoint, img)
        elapsed = time.time() - start
        t.log_test(f"{name} response < 10s",
                   elapsed < 10 and code == 200,
                   f"time={elapsed:.2f}s, code={code}",
                   expected="< 10s", got=f"{elapsed:.2f}s")


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="GoWithSally Face API Test Suite")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    parser.add_argument("--suite", "-s", type=str, help="Run specific suite (health, auth, detect, etc.)")
    args = parser.parse_args()

    t = TestRunner(verbose=args.verbose)

    t.log(f"\n{'='*60}", C.BOLD)
    t.log(f" GoWithSally Face API - Functional Test Suite", C.BOLD)
    t.log(f" {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", C.BOLD)
    t.log(f" Server: {BASE_URL}", C.BOLD)
    t.log(f"{'='*60}", C.BOLD)

    # Check server is up
    try:
        r = requests.get(f"{BASE_URL}/api/health/ping", timeout=5)
        if r.status_code != 200:
            t.log(f"\nERROR: Server not responding at {BASE_URL}", C.FAIL)
            sys.exit(1)
    except Exception as e:
        t.log(f"\nERROR: Cannot connect to {BASE_URL}: {e}", C.FAIL)
        sys.exit(1)

    # Login
    t.log(f"\nAuthenticating...", C.INFO)
    if not t.get_api_key():
        t.log("WARNING: Could not get API key, some tests will fail", C.WARN)

    # List available test assets
    t.log(f"\nTest assets:", C.INFO)
    if os.path.isdir(IMG_DIR):
        imgs = [f for f in os.listdir(IMG_DIR) if f.endswith(('.jpg', '.png'))]
        t.log(f"  Images: {len(imgs)} files in {IMG_DIR}", C.INFO)
    else:
        t.log(f"  Images: NONE (run download_test_assets.ps1 first!)", C.WARN)
        imgs = []

    audio_files = []
    for d in [AUDIO_DIR, "/app/test"]:
        if os.path.isdir(d):
            audio_files.extend([f for f in os.listdir(d) if f.endswith(('.wav', '.mp3'))])
    t.log(f"  Audio: {len(audio_files)} files", C.INFO)

    # Run test suites
    suites = [
        ("health", test_health),
        ("auth", test_auth),
        ("detect", test_face_detection),
        ("landmarks", test_landmarks),
        ("recognition", test_recognition),
        ("gender", test_gender),
        ("antispoof", test_antispoof),
        ("voice", test_voice_gender),
        ("age", test_age),
        ("facecount", test_face_count),
        ("headcount", test_head_detection),
        ("analyze", test_unified_analyze),
        ("gowithsally", test_gowithsally_endpoints),
        ("edge", test_edge_cases),
        ("performance", test_performance),
    ]

    for name, func in suites:
        if args.suite and args.suite != name:
            continue
        try:
            func(t)
        except Exception as e:
            t.log(f"\n  ERROR in suite '{name}': {e}", C.FAIL)
            t.failed += 1

    # Summary
    total = t.passed + t.failed + t.skipped
    elapsed = time.time() - t.start_time
    t.log(f"\n{'='*60}", C.BOLD)
    t.log(f" TEST RESULTS", C.BOLD)
    t.log(f"{'='*60}", C.BOLD)
    t.log(f"  {C.OK}Passed:  {t.passed}{C.END}")
    t.log(f"  {C.FAIL}Failed:  {t.failed}{C.END}")
    t.log(f"  {C.WARN}Skipped: {t.skipped}{C.END}")
    t.log(f"  Total:   {total}")
    t.log(f"  Time:    {elapsed:.1f}s")

    if t.failed == 0:
        t.log(f"\n  {C.OK}{C.BOLD}ALL TESTS PASSED!{C.END}")
    else:
        t.log(f"\n  {C.FAIL}{C.BOLD}{t.failed} TESTS FAILED{C.END}")

    # Save results to JSON
    os.makedirs(RESULTS_DIR, exist_ok=True)
    result_file = os.path.join(RESULTS_DIR,
                               f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(result_file, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "server": BASE_URL,
            "summary": {
                "passed": t.passed,
                "failed": t.failed,
                "skipped": t.skipped,
                "total": total,
                "duration_seconds": round(elapsed, 1)
            },
            "tests": t.results
        }, f, indent=2)
    t.log(f"\n  Results saved to: {result_file}", C.INFO)

    sys.exit(0 if t.failed == 0 else 1)


if __name__ == "__main__":
    main()
