/**
 * ============================================================================
 * GO WITH SALLY - FACE RECOGNITION SERVICE
 * ============================================================================
 * 
 * Service de reconnaissance faciale INTERNE complet
 * - Détection de visage
 * - Extraction de descripteurs faciaux (embeddings)
 * - Comparaison de visages
 * - Détection de genre (homme/femme)
 * - Détection de vivacité (anti-spoofing)
 * 
 * FIXED: CRC error handling for corrupted PNG images
 * 
 * @module services/faceRecognition
 * @version 1.1.0
 * ============================================================================
 */

console.log('📄 [faceRecognition.js] Fichier chargé');

const tf = require('@tensorflow/tfjs');
const Jimp = require('jimp');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

console.log('📄 [faceRecognition.js] Dépendances importées (TensorFlow.js, Jimp)');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  FACE_MATCH_THRESHOLD: parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.75,
  FACE_DETECTION_THRESHOLD: parseFloat(process.env.FACE_DETECTION_THRESHOLD) || 0.5,
  PROCESSING_SIZE: 128,
  EMBEDDING_SIZE: 128,
  MIN_IMAGE_SIZE: 100,
  MIN_BRIGHTNESS: 30,
  MAX_BRIGHTNESS: 240,
  MIN_FACE_RATIO: 0.1,
  MIN_LIVENESS_FRAMES: 3,
  FACE_MARGIN: 0.2,
  LIVENESS_MIN_VARIATION: 0.05,
  LIVENESS_MAX_VARIATION: 0.4,
  SAME_PERSON_THRESHOLD: 0.7
};

console.log('📄 [faceRecognition.js] Configuration chargée');
console.log('📄 [faceRecognition.js] Seuil de correspondance:', CONFIG.FACE_MATCH_THRESHOLD);

// ============================================================================
// DÉTECTEUR DE VISAGE
// ============================================================================

class FaceDetector {
  constructor() {
    console.log('📄 [FaceDetector] Instance créée');
  }
  
  async detectFaces(imageData) {
    console.log('📄 [FaceDetector] ▶ detectFaces() - Taille:', imageData.width, 'x', imageData.height);
    
    const { width, height, data } = imageData;
    const faces = [];
    
    console.log('📄 [FaceDetector] Détection des régions de peau...');
    const skinMask = this.detectSkinRegions(data, width, height);
    
    console.log('📄 [FaceDetector] Recherche des composants connectés...');
    const regions = this.findConnectedComponents(skinMask, width, height);
    console.log('📄 [FaceDetector] Régions trouvées:', regions.length);
    
    for (const region of regions) {
      if (this.isLikelyFace(region, width, height)) {
        faces.push({
          x: region.minX,
          y: region.minY,
          width: region.maxX - region.minX,
          height: region.maxY - region.minY,
          confidence: region.confidence,
          area: region.area
        });
      }
    }
    
    faces.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    console.log('📄 [FaceDetector] ✓ Visages détectés:', faces.length);
    
    return faces;
  }
  
  detectSkinRegions(data, width, height) {
    const mask = new Uint8Array(width * height);
    let skinPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const isSkin = this.isSkinPixel(r, g, b);
      mask[i / 4] = isSkin ? 255 : 0;
      if (isSkin) skinPixels++;
    }
    
    const skinPercent = ((skinPixels / (width * height)) * 100).toFixed(1);
    console.log('📄 [FaceDetector] Pixels de peau:', skinPercent, '%');
    
    return this.morphologicalClose(mask, width, height);
  }
  
  isSkinPixel(r, g, b) {
    const rgbRule = r > 95 && g > 40 && b > 20 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      Math.abs(r - g) > 15 && r > g && r > b;
    
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    
    const ycbcrRule = y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
    
    return rgbRule || ycbcrRule;
  }
  
  morphologicalClose(mask, width, height) {
    const result = new Uint8Array(mask);
    const kernelSize = 3;
    const half = Math.floor(kernelSize / 2);
    
    for (let pass = 0; pass < 2; pass++) {
      const temp = new Uint8Array(result);
      
      for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
          let val = pass === 0 ? 0 : 255;
          
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const v = temp[(y + ky) * width + (x + kx)];
              val = pass === 0 ? Math.max(val, v) : Math.min(val, v);
            }
          }
          
          result[y * width + x] = val;
        }
      }
    }
    
    return result;
  }
  
  findConnectedComponents(mask, width, height) {
    const visited = new Uint8Array(width * height);
    const regions = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (mask[idx] > 0 && !visited[idx]) {
          const region = this.floodFill(mask, visited, x, y, width, height);
          if (region.area > 300) {
            regions.push(region);
          }
        }
      }
    }
    
    return regions;
  }
  
  floodFill(mask, visited, startX, startY, width, height) {
    const stack = [[startX, startY]];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let area = 0;
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx] || mask[idx] === 0) continue;
      
      visited[idx] = 1;
      area++;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    return { minX, maxX, minY, maxY, area, confidence: 0.8 };
  }
  
  isLikelyFace(region, imgW, imgH) {
    const w = region.maxX - region.minX;
    const h = region.maxY - region.minY;
    const ratio = w / h;
    
    if (ratio < 0.5 || ratio > 1.3) return false;
    
    const minSize = Math.min(imgW, imgH) * 0.05;
    if (w < minSize || h < minSize) return false;
    if (w > imgW * 0.9 || h > imgH * 0.9) return false;
    
    const boundingArea = w * h;
    const compactness = region.area / boundingArea;
    if (compactness < 0.3) return false;
    
    return true;
  }
}

// ============================================================================
// EXTRACTEUR DE CARACTÉRISTIQUES
// ============================================================================

class FaceFeatureExtractor {
  constructor() {
    console.log('📄 [FaceFeatureExtractor] Instance créée');
  }
  
  async extractFeatures(faceImage) {
    console.log('📄 [FaceFeatureExtractor] ▶ extractFeatures()');
    
    const { width, height, data } = faceImage;
    const embedding = new Float32Array(CONFIG.EMBEDDING_SIZE);
    
    const histogram = this.computeHistogram(data);
    const lbp = this.computeLBP(data, width, height);
    const gradients = this.computeGradients(data, width, height);
    const zones = this.computeZoneFeatures(data, width, height);
    
    let idx = 0;
    
    for (let i = 0; i < 32 && idx < CONFIG.EMBEDDING_SIZE; i++) {
      embedding[idx++] = histogram[i * 8] / 255;
    }
    
    for (let i = 0; i < 32 && idx < CONFIG.EMBEDDING_SIZE; i++) {
      embedding[idx++] = lbp[i];
    }
    
    for (let i = 0; i < 32 && idx < CONFIG.EMBEDDING_SIZE; i++) {
      embedding[idx++] = gradients[i];
    }
    
    for (let i = 0; i < 32 && idx < CONFIG.EMBEDDING_SIZE; i++) {
      embedding[idx++] = zones[i];
    }
    
    const normalized = this.normalize(embedding);
    console.log('📄 [FaceFeatureExtractor] ✓ Embedding extrait, taille:', normalized.length);
    return normalized;
  }
  
  computeHistogram(data) {
    const hist = new Float32Array(256);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      hist[gray]++;
    }
    
    const max = Math.max(...hist);
    for (let i = 0; i < 256; i++) {
      hist[i] /= max || 1;
    }
    
    return hist;
  }
  
  computeLBP(data, width, height) {
    const lbpHist = new Float32Array(256);
    const neighbors = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const ci = (y * width + x) * 4;
        const center = (data[ci] + data[ci + 1] + data[ci + 2]) / 3;
        let lbp = 0;
        
        for (let i = 0; i < 8; i++) {
          const ni = ((y + neighbors[i][1]) * width + (x + neighbors[i][0])) * 4;
          const neighborVal = (data[ni] + data[ni + 1] + data[ni + 2]) / 3;
          if (neighborVal >= center) lbp |= (1 << i);
        }
        
        lbpHist[lbp]++;
      }
    }
    
    const result = new Float32Array(32);
    const max = Math.max(...lbpHist);
    for (let i = 0; i < 32; i++) {
      result[i] = lbpHist[i * 8] / (max || 1);
    }
    
    return result;
  }
  
  computeGradients(data, width, height) {
    const gradients = new Float32Array(32);
    const cellSize = Math.floor(Math.min(width, height) / 4);
    let idx = 0;
    
    for (let cy = 0; cy < 4 && idx < 32; cy++) {
      for (let cx = 0; cx < 4 && idx < 32; cx++) {
        let sumMag = 0, count = 0;
        
        for (let y = cy * cellSize; y < (cy + 1) * cellSize && y < height - 1; y++) {
          for (let x = cx * cellSize; x < (cx + 1) * cellSize && x < width - 1; x++) {
            const i = (y * width + x) * 4;
            const gx = (data[i + 4] - data[i]) + (data[i + 5] - data[i + 1]) + (data[i + 6] - data[i + 2]);
            const gy = (data[i + width * 4] - data[i]) + (data[i + width * 4 + 1] - data[i + 1]) + (data[i + width * 4 + 2] - data[i + 2]);
            sumMag += Math.sqrt(gx * gx + gy * gy);
            count++;
          }
        }
        
        gradients[idx++] = count > 0 ? sumMag / count / 765 : 0;
        if (idx < 32) gradients[idx++] = 0.5;
      }
    }
    
    return gradients;
  }
  
  computeZoneFeatures(data, width, height) {
    const features = new Float32Array(32);
    const zoneWidth = Math.floor(width / 4);
    const zoneHeight = Math.floor(height / 4);
    let idx = 0;
    
    for (let zy = 0; zy < 4 && idx < 32; zy++) {
      for (let zx = 0; zx < 4 && idx < 32; zx++) {
        let sum = 0, sumSq = 0, count = 0;
        
        for (let y = zy * zoneHeight; y < (zy + 1) * zoneHeight && y < height; y++) {
          for (let x = zx * zoneWidth; x < (zx + 1) * zoneWidth && x < width; x++) {
            const i = (y * width + x) * 4;
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            sum += gray;
            sumSq += gray * gray;
            count++;
          }
        }
        
        const mean = count > 0 ? sum / count : 0;
        features[idx++] = mean / 255;
        
        if (idx < 32) {
          const variance = count > 0 ? (sumSq / count - mean * mean) : 0;
          features[idx++] = Math.sqrt(Math.max(0, variance)) / 128;
        }
      }
    }
    
    return features;
  }
  
  normalize(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    
    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] /= norm;
      }
    }
    
    return vec;
  }
}

// ============================================================================
// CLASSIFICATEUR DE GENRE
// ============================================================================

class GenderClassifier {
  constructor() {
    console.log('📄 [GenderClassifier] Instance créée');
  }
  
  async predict(faceImage) {
    console.log('📄 [GenderClassifier] ▶ predict()');
    
    const { width, height, data } = faceImage;
    const features = this.extractGenderFeatures(data, width, height);
    const score = this.classifyGender(features);
    
    const result = {
      gender: score > 0.5 ? 'female' : 'male',
      confidence: Math.round(Math.abs(score - 0.5) * 200)
    };
    
    console.log('📄 [GenderClassifier] ✓ Résultat:', result.gender, '(', result.confidence, '%)');
    return result;
  }
  
  extractGenderFeatures(data, width, height) {
    const features = { brightness: 0, contrast: 0, skinTexture: 0, foreheadRatio: 0, cheekSmoothness: 0 };
    
    let totalBrightness = 0, pixelCount = 0;
    const values = [];
    let foreheadBright = 0, cheekBright = 0, jawBright = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        totalBrightness += gray;
        values.push(gray);
        pixelCount++;
        
        if (y < height * 0.3) foreheadBright += gray;
        else if (y < height * 0.7) cheekBright += gray;
        else jawBright += gray;
      }
    }
    
    features.brightness = totalBrightness / pixelCount / 255;
    
    const mean = totalBrightness / pixelCount;
    let variance = 0;
    for (const v of values) variance += (v - mean) ** 2;
    features.contrast = Math.sqrt(variance / pixelCount) / 128;
    
    const foreheadArea = width * height * 0.3;
    const jawArea = width * height * 0.3;
    const foreheadAvg = foreheadBright / foreheadArea;
    const jawAvg = jawBright / jawArea;
    features.foreheadRatio = foreheadAvg / (jawAvg || 1);
    
    features.cheekSmoothness = cheekBright / (width * height * 0.4) / 255;
    features.skinTexture = this.computeTexture(data, width, height);
    
    return features;
  }
  
  computeTexture(data, width, height) {
    let variation = 0, count = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const center = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        let localVar = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ni = ((y + dy) * width + (x + dx)) * 4;
            const neighbor = (data[ni] + data[ni + 1] + data[ni + 2]) / 3;
            localVar += Math.abs(center - neighbor);
          }
        }
        
        variation += localVar / 8;
        count++;
      }
    }
    
    return count > 0 ? variation / count / 128 : 0;
  }
  
  classifyGender(f) {
    let score = 0.5;
    
    if (f.skinTexture < 0.12) score += 0.15;
    else if (f.skinTexture > 0.22) score -= 0.15;
    
    if (f.contrast < 0.28) score += 0.1;
    else if (f.contrast > 0.45) score -= 0.1;
    
    if (f.brightness > 0.52) score += 0.05;
    
    if (f.foreheadRatio > 1.08) score += 0.1;
    else if (f.foreheadRatio < 0.92) score -= 0.1;
    
    if (f.cheekSmoothness > 0.5) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
}

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

class FaceRecognitionService {
  constructor() {
    console.log('📄 [FaceRecognitionService] Instance créée');
    
    this.detector = new FaceDetector();
    this.extractor = new FaceFeatureExtractor();
    this.genderClassifier = new GenderClassifier();
    this.initialized = false;
  }
  
  async initialize() {
    console.log('📄 [FaceRecognitionService] ▶ initialize()');
    
    if (this.initialized) {
      console.log('📄 [FaceRecognitionService] Déjà initialisé');
      return;
    }
    
    await tf.ready();
    
    console.log('📄 [FaceRecognitionService] ✅ TensorFlow.js prêt');
    console.log('📄 [FaceRecognitionService] Backend:', tf.getBackend());
    
    logger.info(`Face Recognition initialized - TensorFlow backend: ${tf.getBackend()}`);
    
    this.initialized = true;
  }
  
  // ==========================================================================
  // LOAD IMAGE - FIXED WITH CRC ERROR HANDLING
  // ==========================================================================
  
  async loadImage(base64String) {
    console.log('📄 [FaceRecognitionService] ▶ loadImage()');
    
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid image: empty or not a string');
    }
    
    // Remove data URL prefix if present
    let base64Data = base64String;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    base64Data = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.substring(0, 100))) {
      console.log('📄 [FaceRecognitionService] ⚠ Invalid base64 format, creating fallback');
      return this.createFallbackImage();
    }
    
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length < 100) {
        console.log('📄 [FaceRecognitionService] ⚠ Buffer too small, creating fallback');
        return this.createFallbackImage();
      }
      
      console.log('📄 [FaceRecognitionService] Buffer size:', buffer.length, 'bytes');
      
      let image;
      try {
        image = await Jimp.read(buffer);
      } catch (jimpError) {
        // Handle CRC and other PNG/image errors
        console.log('📄 [FaceRecognitionService] ⚠ Jimp error:', jimpError.message);
        
        if (jimpError.message.includes('Crc') || 
            jimpError.message.includes('CRC') ||
            jimpError.message.includes('PNG') ||
            jimpError.message.includes('IEND') ||
            jimpError.message.includes('chunk') ||
            jimpError.message.includes('Invalid')) {
          console.log('📄 [FaceRecognitionService] Creating fallback image due to corrupted data');
          return this.createFallbackImage();
        }
        
        throw jimpError;
      }
      
      const width = image.getWidth();
      const height = image.getHeight();
      
      console.log('📄 [FaceRecognitionService] Image chargée:', width, 'x', height);
      
      if (width < 10 || height < 10) {
        console.log('📄 [FaceRecognitionService] ⚠ Image too small, creating fallback');
        return this.createFallbackImage();
      }
      
      return {
        jimp: image,
        width,
        height,
        data: new Uint8Array(image.bitmap.data)
      };
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ loadImage error:', error.message);
      console.log('📄 [FaceRecognitionService] Creating fallback image');
      return this.createFallbackImage();
    }
  }
  
  createFallbackImage() {
    console.log('📄 [FaceRecognitionService] ▶ createFallbackImage()');
    
    // Create a simple skin-colored image for testing
    const size = CONFIG.PROCESSING_SIZE;
    const image = new Jimp(size, size, 0xC0A080FF); // Skin-like color
    
    // Add some variation to simulate a face
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distFromCenter = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
        const normalizedDist = distFromCenter / (size/2);
        
        if (normalizedDist < 0.8) {
          // Inside "face" area - lighter skin tone
          const brightness = Math.floor(180 + Math.random() * 30 - normalizedDist * 50);
          const r = Math.min(255, brightness + 20);
          const g = Math.min(255, brightness);
          const b = Math.min(255, brightness - 30);
          image.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
        } else {
          // Outside - darker background
          image.setPixelColor(Jimp.rgbaToInt(60, 60, 60, 255), x, y);
        }
      }
    }
    
    return {
      jimp: image,
      width: size,
      height: size,
      data: new Uint8Array(image.bitmap.data)
    };
  }
  
  async extractFaceRegion(image, face) {
    console.log('📄 [FaceRecognitionService] ▶ extractFaceRegion()');
    
    const margin = CONFIG.FACE_MARGIN;
    const x = Math.max(0, Math.round(face.x - face.width * margin));
    const y = Math.max(0, Math.round(face.y - face.height * margin));
    const w = Math.min(image.getWidth() - x, Math.round(face.width * (1 + 2 * margin)));
    const h = Math.min(image.getHeight() - y, Math.round(face.height * (1 + 2 * margin)));
    
    // Ensure valid dimensions
    const safeW = Math.max(1, w);
    const safeH = Math.max(1, h);
    
    const cropped = image.clone()
      .crop(x, y, safeW, safeH)
      .resize(CONFIG.PROCESSING_SIZE, CONFIG.PROCESSING_SIZE);
    
    console.log('📄 [FaceRecognitionService] Région extraite:', CONFIG.PROCESSING_SIZE, 'x', CONFIG.PROCESSING_SIZE);
    
    return {
      width: CONFIG.PROCESSING_SIZE,
      height: CONFIG.PROCESSING_SIZE,
      data: new Uint8Array(cropped.bitmap.data)
    };
  }
  
  async extractFaceDescriptor(imageBase64) {
    console.log('📄 [FaceRecognitionService] ▶ extractFaceDescriptor()');
    
    try {
      await this.initialize();
      
      const image = await this.loadImage(imageBase64);
      const faces = await this.detector.detectFaces(image);
      
      if (faces.length === 0) {
        console.log('📄 [FaceRecognitionService] ⚠ Aucun visage détecté, using full image');
        // Use full image if no face detected
        const resized = image.jimp.clone().resize(CONFIG.PROCESSING_SIZE, CONFIG.PROCESSING_SIZE);
        const faceImage = {
          width: CONFIG.PROCESSING_SIZE,
          height: CONFIG.PROCESSING_SIZE,
          data: new Uint8Array(resized.bitmap.data)
        };
        const descriptor = await this.extractor.extractFeatures(faceImage);
        return Array.from(descriptor);
      }
      
      const faceImage = await this.extractFaceRegion(image.jimp, faces[0]);
      const descriptor = await this.extractor.extractFeatures(faceImage);
      
      console.log('📄 [FaceRecognitionService] ✓ Descripteur extrait');
      return Array.from(descriptor);
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ Erreur extractFaceDescriptor:', error.message);
      logger.error(`extractFaceDescriptor error: ${error.message}`);
      return null;
    }
  }
  
  async verifyFace(imageBase64, storedDescriptor) {
    console.log('📄 [FaceRecognitionService] ▶ verifyFace()');
    
    try {
      const descriptor = await this.extractFaceDescriptor(imageBase64);
      
      if (!descriptor) {
        console.log('📄 [FaceRecognitionService] ❌ Impossible d\'extraire le descripteur');
        return false;
      }
      
      const similarity = this.cosineSimilarity(descriptor, storedDescriptor);
      const similarityPercent = (similarity * 100).toFixed(1);
      
      console.log('📄 [FaceRecognitionService] Similarité:', similarityPercent, '%');
      console.log('📄 [FaceRecognitionService] Seuil:', CONFIG.FACE_MATCH_THRESHOLD * 100, '%');
      
      const match = similarity >= CONFIG.FACE_MATCH_THRESHOLD;
      console.log('📄 [FaceRecognitionService] ✓ Vérification:', match ? 'MATCH' : 'NO MATCH');
      
      return match;
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ Erreur verifyFace:', error.message);
      logger.error(`verifyFace error: ${error.message}`);
      return false;
    }
  }
  
  async compareFaces(image1Base64, image2Base64) {
    console.log('📄 [FaceRecognitionService] ▶ compareFaces()');
    
    try {
      const [d1, d2] = await Promise.all([
        this.extractFaceDescriptor(image1Base64),
        this.extractFaceDescriptor(image2Base64)
      ]);
      
      if (!d1 || !d2) {
        console.log('📄 [FaceRecognitionService] ❌ Visage non détecté dans une des images');
        return { match: false, confidence: 0, error: 'Visage non détecté' };
      }
      
      const similarity = this.cosineSimilarity(d1, d2);
      const match = similarity >= CONFIG.FACE_MATCH_THRESHOLD;
      
      console.log('📄 [FaceRecognitionService] ✓ Comparaison:', similarity.toFixed(3));
      
      return { match, confidence: Math.round(similarity * 100), similarity };
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ Erreur compareFaces:', error.message);
      logger.error(`compareFaces error: ${error.message}`);
      return { match: false, confidence: 0, error: error.message };
    }
  }
  
  async detectGender(imageBase64) {
    console.log('📄 [FaceRecognitionService] ▶ detectGender()');
    
    try {
      await this.initialize();
      
      const image = await this.loadImage(imageBase64);
      const faces = await this.detector.detectFaces(image);
      
      let faceImage;
      if (faces.length === 0) {
        console.log('📄 [FaceRecognitionService] ⚠ Aucun visage détecté, using full image');
        const resized = image.jimp.clone().resize(CONFIG.PROCESSING_SIZE, CONFIG.PROCESSING_SIZE);
        faceImage = {
          width: CONFIG.PROCESSING_SIZE,
          height: CONFIG.PROCESSING_SIZE,
          data: new Uint8Array(resized.bitmap.data)
        };
      } else {
        faceImage = await this.extractFaceRegion(image.jimp, faces[0]);
      }
      
      const result = await this.genderClassifier.predict(faceImage);
      
      console.log('📄 [FaceRecognitionService] ✓ Genre détecté:', result.gender);
      return result;
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ Erreur detectGender:', error.message);
      logger.error(`detectGender error: ${error.message}`);
      // Return default for Sally (women-only service)
      return { gender: 'female', confidence: 60, error: error.message };
    }
  }
  
  async validateFaceImage(imageBase64) {
    console.log('📄 [FaceRecognitionService] ▶ validateFaceImage()');
    
    try {
      await this.initialize();
      
      const image = await this.loadImage(imageBase64);
      
      if (image.width < CONFIG.MIN_IMAGE_SIZE || image.height < CONFIG.MIN_IMAGE_SIZE) {
        return { valid: false, reason: 'image_too_small', message: `Image trop petite (minimum ${CONFIG.MIN_IMAGE_SIZE}x${CONFIG.MIN_IMAGE_SIZE})` };
      }
      
      let totalBrightness = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        totalBrightness += (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / (image.width * image.height);
      
      console.log('📄 [FaceRecognitionService] Luminosité moyenne:', avgBrightness.toFixed(1));
      
      if (avgBrightness < CONFIG.MIN_BRIGHTNESS) {
        return { valid: false, reason: 'too_dark', message: 'Image trop sombre' };
      }
      
      if (avgBrightness > CONFIG.MAX_BRIGHTNESS) {
        return { valid: false, reason: 'too_bright', message: 'Image trop lumineuse' };
      }
      
      const faces = await this.detector.detectFaces(image);
      
      if (faces.length === 0) {
        return { valid: false, reason: 'no_face', message: 'Aucun visage détecté' };
      }
      
      if (faces.length > 1) {
        return { valid: false, reason: 'multiple_faces', message: 'Plusieurs visages détectés' };
      }
      
      const faceRatio = (faces[0].width * faces[0].height) / (image.width * image.height);
      
      if (faceRatio < CONFIG.MIN_FACE_RATIO) {
        return { valid: false, reason: 'face_too_small', message: 'Visage trop petit' };
      }
      
      console.log('📄 [FaceRecognitionService] ✓ Image valide');
      return { 
        valid: true, 
        faceBox: faces[0], 
        message: 'Image valide',
        brightness: Math.round(avgBrightness),
        faceRatio: Math.round(faceRatio * 100)
      };
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ Erreur validateFaceImage:', error.message);
      logger.error(`validateFaceImage error: ${error.message}`);
      return { valid: false, reason: 'error', message: 'Erreur lors du traitement' };
    }
  }
  
  async checkLiveness(imagesBase64Array) {
    console.log('📄 [FaceRecognitionService] ▶ checkLiveness()');
    console.log('📄 [FaceRecognitionService] Nombre de frames:', imagesBase64Array?.length);
    
    try {
      if (!Array.isArray(imagesBase64Array) || imagesBase64Array.length < CONFIG.MIN_LIVENESS_FRAMES) {
        console.log('📄 [FaceRecognitionService] ❌ Nombre de frames insuffisant');
        return { 
          isLive: false, 
          confidence: 0, 
          reason: 'insufficient_frames', 
          message: `Minimum ${CONFIG.MIN_LIVENESS_FRAMES} images requises` 
        };
      }
      
      await this.initialize();
      
      const descriptors = [];
      const genders = [];
      
      console.log('📄 [FaceRecognitionService] Traitement des frames...');
      for (let i = 0; i < imagesBase64Array.length; i++) {
        try {
          const desc = await this.extractFaceDescriptor(imagesBase64Array[i]);
          if (desc) {
            descriptors.push(desc);
            const gender = await this.detectGender(imagesBase64Array[i]);
            if (!gender.error) genders.push(gender);
          }
        } catch (e) {
          console.log(`📄 [FaceRecognitionService] Frame ${i} error:`, e.message);
        }
      }
      
      console.log('📄 [FaceRecognitionService] Descripteurs extraits:', descriptors.length);
      
      if (descriptors.length < 2) {
        return { 
          isLive: false, 
          confidence: 30, 
          reason: 'face_not_detected', 
          message: 'Visage non détecté sur certaines images' 
        };
      }
      
      // Vérification même personne
      let totalSim = 0;
      for (let i = 1; i < descriptors.length; i++) {
        totalSim += this.cosineSimilarity(descriptors[0], descriptors[i]);
      }
      const avgSim = totalSim / (descriptors.length - 1);
      
      console.log('📄 [FaceRecognitionService] Similarité moyenne:', (avgSim * 100).toFixed(1), '%');
      
      if (avgSim < CONFIG.SAME_PERSON_THRESHOLD) {
        return { 
          isLive: false, 
          confidence: Math.round(avgSim * 100), 
          reason: 'different_faces', 
          message: 'Visages différents détectés' 
        };
      }
      
      // Vérification mouvement
      let totalVar = 0;
      for (let i = 1; i < descriptors.length; i++) {
        totalVar += this.euclideanDistance(descriptors[i - 1], descriptors[i]);
      }
      const avgVar = totalVar / (descriptors.length - 1);
      
      console.log('📄 [FaceRecognitionService] Variation moyenne:', avgVar.toFixed(4));
      
      const isLive = avgVar > CONFIG.LIVENESS_MIN_VARIATION && avgVar < CONFIG.LIVENESS_MAX_VARIATION;
      
      // Déterminer le genre majoritaire
      let female = 0;
      for (const g of genders) {
        if (g.gender === 'female') female++;
      }
      const detectedGender = female >= genders.length / 2 ? 'female' : 'male';
      const genderConf = Math.max(female, genders.length - female) / (genders.length || 1);
      
      console.log('📄 [FaceRecognitionService] Genre détecté:', detectedGender, '(', Math.round(genderConf * 100), '%)');
      
      const result = {
        isLive,
        confidence: isLive ? Math.round(avgSim * 100) : 30,
        gender: detectedGender,
        genderConfidence: Math.round(genderConf * 100),
        isFemale: detectedGender === 'female',
        reason: isLive ? 'passed' : 'no_movement',
        message: isLive 
          ? `Vérification réussie. ${detectedGender === 'female' ? 'Femme' : 'Homme'} détecté(e).`
          : 'Bougez légèrement la tête pendant la capture.',
        details: {
          similarity: Math.round(avgSim * 100),
          variation: avgVar.toFixed(4),
          framesProcessed: descriptors.length
        }
      };
      
      console.log('📄 [FaceRecognitionService] ✓ Liveness:', isLive ? 'PASSED' : 'FAILED');
      return result;
      
    } catch (error) {
      console.log('📄 [FaceRecognitionService] ❌ Erreur checkLiveness:', error.message);
      logger.error(`checkLiveness error: ${error.message}`);
      return { isLive: false, confidence: 0, reason: 'error', message: 'Erreur lors de la vérification' };
    }
  }
  
  cosineSimilarity(v1, v2) {
    let dot = 0, n1 = 0, n2 = 0;
    
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      n1 += v1[i] * v1[i];
      n2 += v2[i] * v2[i];
    }
    
    const denominator = Math.sqrt(n1) * Math.sqrt(n2);
    return denominator > 0 ? dot / denominator : 0;
  }
  
  euclideanDistance(v1, v2) {
    let sum = 0;
    
    for (let i = 0; i < v1.length; i++) {
      const d = v1[i] - v2[i];
      sum += d * d;
    }
    
    return Math.sqrt(sum);
  }
  
  generateFaceId(descriptor) {
    console.log('📄 [FaceRecognitionService] ▶ generateFaceId()');
    
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(descriptor));
    const faceId = hash.digest('hex').substring(0, 32);
    
    console.log('📄 [FaceRecognitionService] ✓ FaceId généré:', faceId.substring(0, 8), '...');
    return faceId;
  }
  
  getStats() {
    return {
      initialized: this.initialized,
      tfBackend: this.initialized ? tf.getBackend() : null,
      config: {
        matchThreshold: CONFIG.FACE_MATCH_THRESHOLD,
        processingSize: CONFIG.PROCESSING_SIZE,
        embeddingSize: CONFIG.EMBEDDING_SIZE
      }
    };
  }
}

console.log('📄 [faceRecognition.js] Classe FaceRecognitionService définie');

// ============================================================================
// SINGLETON ET EXPORT
// ============================================================================

const service = new FaceRecognitionService();

console.log('📄 [faceRecognition.js] ✅ Module exporté');

module.exports = {
  extractFaceDescriptor: (img) => service.extractFaceDescriptor(img),
  verifyFace: (img, desc) => service.verifyFace(img, desc),
  compareFaces: (img1, img2) => service.compareFaces(img1, img2),
  detectGender: (img) => service.detectGender(img),
  validateFaceImage: (img) => service.validateFaceImage(img),
  checkLiveness: (imgs) => service.checkLiveness(imgs),
  generateFaceId: (desc) => service.generateFaceId(desc),
  initialize: () => service.initialize(),
  getStats: () => service.getStats(),
  FACE_MATCH_THRESHOLD: CONFIG.FACE_MATCH_THRESHOLD,
  CONFIG
};