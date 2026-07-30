/**
 * PhytoPathometric — Simple & Robust Lesion Detection
 * Direct color-based detection without complex thresholding
 * Works reliably on real leaf images
 */

export interface SimpleLesionResult {
  severity: number; // 0-100%
  necrosisPercentage: number;
  chlorosisPercentage: number;
  healthyPercentage: number;
  lesionCount: number;
  confidence: number;
  dominantType: string;
}

/**
 * Simple RGB to HSV conversion
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h: h * 360, s: s * 100, v: v * 100 };
}

/**
 * Detect lesions using simple color ranges
 * Much more reliable than complex algorithms
 */
export function detectLesionsSimple(imageData: ImageData): SimpleLesionResult {
  const data = imageData.data;
  
  let necrosisPixels = 0;
  let chlorosisPixels = 0;
  let healthyPixels = 0;
  let totalPixels = 0;

  // Process every pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 100) continue;

    totalPixels++;

    // Convert to HSV for better color detection
    const { h, s, v } = rgbToHsv(r, g, b);

    // NECROSIS: Dark brown/red colors
    // Characteristics: Low brightness (V < 60), reddish-brown hue (0-30° or 330-360°)
    const isNecrotic =
      v < 60 && ((h >= 0 && h <= 30) || h >= 330) && s > 20;

    // CHLOROSIS: Yellow/light colors
    // Characteristics: High brightness (V > 70), yellow hue (45-75°), low saturation
    const isChlorotic =
      v > 70 && h >= 45 && h <= 75 && s < 80;

    // ALTERNATIVE CHLOROSIS: Very light yellow-green
    const isChloroticLight =
      v > 75 && h >= 40 && h <= 90 && s < 50 && g > r;

    // HEALTHY: Green colors
    // Characteristics: Medium-high brightness, green hue (90-150°), good saturation
    const isHealthy =
      h >= 90 && h <= 150 && v > 40 && v < 90 && s > 30;

    if (isNecrotic) {
      necrosisPixels++;
    } else if (isChlorotic || isChloroticLight) {
      chlorosisPixels++;
    } else if (isHealthy) {
      healthyPixels++;
    }
  }

  if (totalPixels === 0) {
    return {
      severity: 0,
      necrosisPercentage: 0,
      chlorosisPercentage: 0,
      healthyPercentage: 0,
      lesionCount: 0,
      confidence: 0,
      dominantType: 'unknown',
    };
  }

  // Calculate percentages
  const necrosisPercentage = (necrosisPixels / totalPixels) * 100;
  const chlorosisPercentage = (chlorosisPixels / totalPixels) * 100;
  const healthyPercentage = (healthyPixels / totalPixels) * 100;
  const severity = necrosisPercentage + chlorosisPercentage;

  // Determine dominant lesion type
  let dominantType = 'healthy';
  if (necrosisPercentage > chlorosisPercentage && necrosisPercentage > 0) {
    dominantType = 'necrotic';
  } else if (chlorosisPercentage > 0) {
    dominantType = 'chlorotic';
  }

  // Confidence based on how much of the image is classified
  const classifiedPixels = necrosisPixels + chlorosisPixels + healthyPixels;
  const confidence = (classifiedPixels / totalPixels) * 100;

  return {
    severity: Math.round(severity * 100) / 100,
    necrosisPercentage: Math.round(necrosisPercentage * 100) / 100,
    chlorosisPercentage: Math.round(chlorosisPercentage * 100) / 100,
    healthyPercentage: Math.round(healthyPercentage * 100) / 100,
    lesionCount: Math.max(necrosisPixels, chlorosisPixels),
    confidence: Math.round(confidence * 100) / 100,
    dominantType,
  };
}

/**
 * Create visualization with simple color overlay
 */
export function createSimpleVisualization(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const output = new ImageData(data, imageData.width, imageData.height);

  for (let i = 0; i < output.data.length; i += 4) {
    const r = output.data[i];
    const g = output.data[i + 1];
    const b = output.data[i + 2];
    const a = output.data[i + 3];

    if (a < 100) continue;

    const { h, s, v } = rgbToHsv(r, g, b);

    // Necrosis -> Red
    if (v < 60 && ((h >= 0 && h <= 30) || h >= 330) && s > 20) {
      output.data[i] = 255;     // R
      output.data[i + 1] = 50;  // G
      output.data[i + 2] = 50;  // B
    }
    // Chlorosis -> Yellow
    else if ((v > 70 && h >= 45 && h <= 75 && s < 80) || 
             (v > 75 && h >= 40 && h <= 90 && s < 50 && g > r)) {
      output.data[i] = 255;     // R
      output.data[i + 1] = 255; // G
      output.data[i + 2] = 0;   // B
    }
    // Healthy -> Green
    else if (h >= 90 && h <= 150 && v > 40 && v < 90 && s > 30) {
      output.data[i] = 50;      // R
      output.data[i + 1] = 200; // G
      output.data[i + 2] = 50;  // B
    }
    // Unknown -> Gray
    else {
      const gray = (r + g + b) / 3;
      output.data[i] = gray;
      output.data[i + 1] = gray;
      output.data[i + 2] = gray;
    }
  }

  return output;
}
