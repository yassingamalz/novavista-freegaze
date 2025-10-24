/**
 * Feature Extraction Module for NovaVista FreeGaze
 * Extracts eye features from MediaPipe landmarks for gaze prediction
 * 
 * Features extracted:
 * - Iris offset (X, Y) - position relative to eye center
 * - Eye aperture - how open the eye is
 * - Normalized features for consistent ML input
 */

import { LANDMARK_INDICES } from './faceDetection';

/**
 * Calculate Euclidean distance between two 3D points
 * @param {Object} point1 - {x, y, z}
 * @param {Object} point2 - {x, y, z}
 * @returns {number} Distance
 */
function distance(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = (point1.z || 0) - (point2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate the center point of multiple points
 * @param {Array} points - Array of {x, y, z} points
 * @returns {Object} Center point {x, y, z}
 */
function calculateCenter(points) {
  const sum = points.reduce((acc, p) => ({
    x: acc.x + p.x,
    y: acc.y + p.y,
    z: acc.z + (p.z || 0)
  }), { x: 0, y: 0, z: 0 });
  
  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
    z: sum.z / points.length
  };
}

/**
 * Extract comprehensive eye features from face landmarks
 * @param {Array} landmarks - All 478 face landmarks from MediaPipe
 * @returns {Object|null} Feature object or null if invalid
 */
export function extractEyeFeatures(landmarks) {
  // Validate input
  if (!landmarks || landmarks.length < 478) {
    console.warn('⚠️ Invalid landmarks - need 478 points for iris tracking');
    return null;
  }
  
  try {
    // Get eye landmarks
    const leftEyeInner = landmarks[LANDMARK_INDICES.LEFT_EYE_INNER];
    const leftEyeOuter = landmarks[LANDMARK_INDICES.LEFT_EYE_OUTER];
    const leftEyeTop = landmarks[LANDMARK_INDICES.LEFT_EYE_TOP];
    const leftEyeBottom = landmarks[LANDMARK_INDICES.LEFT_EYE_BOTTOM];
    
    const rightEyeInner = landmarks[LANDMARK_INDICES.RIGHT_EYE_INNER];
    const rightEyeOuter = landmarks[LANDMARK_INDICES.RIGHT_EYE_OUTER];
    const rightEyeTop = landmarks[LANDMARK_INDICES.RIGHT_EYE_TOP];
    const rightEyeBottom = landmarks[LANDMARK_INDICES.RIGHT_EYE_BOTTOM];
    
    // Get iris centers (only available with refineLandmarks: true)
    const leftIrisCenter = landmarks[LANDMARK_INDICES.LEFT_IRIS_CENTER];
    const rightIrisCenter = landmarks[LANDMARK_INDICES.RIGHT_IRIS_CENTER];
    
    // Calculate eye centers (geometric center of eye corners)
    const leftEyeCenter = calculateCenter([leftEyeInner, leftEyeOuter]);
    const rightEyeCenter = calculateCenter([rightEyeInner, rightEyeOuter]);
    
    // Calculate iris offset from eye center (key feature for gaze direction)
    const leftIrisOffsetX = leftIrisCenter.x - leftEyeCenter.x;
    const leftIrisOffsetY = leftIrisCenter.y - leftEyeCenter.y;
    
    const rightIrisOffsetX = rightIrisCenter.x - rightEyeCenter.x;
    const rightIrisOffsetY = rightIrisCenter.y - rightEyeCenter.y;
    
    // Calculate eye width (for normalization)
    const leftEyeWidth = distance(leftEyeInner, leftEyeOuter);
    const rightEyeWidth = distance(rightEyeInner, rightEyeOuter);
    
    // Calculate eye aperture (how open the eye is)
    const leftEyeAperture = distance(leftEyeTop, leftEyeBottom);
    const rightEyeAperture = distance(rightEyeTop, rightEyeBottom);
    
    // Normalize iris offset by eye width (scale invariant)
    const leftIrisOffsetXNorm = leftIrisOffsetX / leftEyeWidth;
    const leftIrisOffsetYNorm = leftIrisOffsetY / leftEyeWidth;
    
    const rightIrisOffsetXNorm = rightIrisOffsetX / rightEyeWidth;
    const rightIrisOffsetYNorm = rightIrisOffsetY / rightEyeWidth;
    
    // Normalize aperture by eye width (ratio of openness)
    const leftApertureRatio = leftEyeAperture / leftEyeWidth;
    const rightApertureRatio = rightEyeAperture / rightEyeWidth;
    
    // Calculate face size for additional normalization
    const faceWidth = distance(
      landmarks[234], // Left face edge
      landmarks[454]  // Right face edge
    );
    
    // Create feature vector (8 features for ML model)
    return {
      // Raw features (for visualization)
      raw: {
        leftIrisOffset: { x: leftIrisOffsetX, y: leftIrisOffsetY },
        rightIrisOffset: { x: rightIrisOffsetX, y: rightIrisOffsetY },
        leftAperture: leftEyeAperture,
        rightAperture: rightEyeAperture,
        leftEyeWidth,
        rightEyeWidth,
        faceWidth
      },
      
      // Normalized features (for ML model input)
      normalized: {
        leftIrisX: leftIrisOffsetXNorm * 10,  // Scale up for better gradients
        leftIrisY: leftIrisOffsetYNorm * 10,
        leftAperture: leftApertureRatio * 10,
        rightIrisX: rightIrisOffsetXNorm * 10,
        rightIrisY: rightIrisOffsetYNorm * 10,
        rightAperture: rightApertureRatio * 10,
        // Additional features for robustness
        irisSymmetry: Math.abs(leftIrisOffsetXNorm - rightIrisOffsetXNorm),
        apertureSymmetry: Math.abs(leftApertureRatio - rightApertureRatio)
      },
      
      // Feature vector (ready for ML model)
      vector: [
        leftIrisOffsetXNorm * 10,
        leftIrisOffsetYNorm * 10,
        leftApertureRatio * 10,
        rightIrisOffsetXNorm * 10,
        rightIrisOffsetYNorm * 10,
        rightApertureRatio * 10,
        Math.abs(leftIrisOffsetXNorm - rightIrisOffsetXNorm) * 10,
        Math.abs(leftApertureRatio - rightApertureRatio) * 10
      ]
    };
    
  } catch (error) {
    console.error('❌ Error extracting eye features:', error);
    return null;
  }
}

/**
 * Check if eye features are valid (not extreme values)
 * Useful for filtering out blinks, looking away, etc.
 * @param {Object} features - Features from extractEyeFeatures
 * @returns {boolean} True if features are valid
 */
export function areEyeFeaturesValid(features) {
  if (!features || !features.normalized) return false;
  
  const { normalized } = features;
  
  // Check if aperture is too small (eye closed/blink)
  const minAperture = 0.5; // Minimum aperture ratio
  if (normalized.leftAperture < minAperture || normalized.rightAperture < minAperture) {
    return false;
  }
  
  // Check if iris offset is too extreme (looking away from camera)
  const maxOffset = 5;
  if (Math.abs(normalized.leftIrisX) > maxOffset || 
      Math.abs(normalized.leftIrisY) > maxOffset ||
      Math.abs(normalized.rightIrisX) > maxOffset || 
      Math.abs(normalized.rightIrisY) > maxOffset) {
    return false;
  }
  
  // Check symmetry (if eyes are doing very different things, might be error)
  const maxSymmetryDiff = 3;
  if (normalized.irisSymmetry > maxSymmetryDiff || 
      normalized.apertureSymmetry > maxSymmetryDiff) {
    return false;
  }
  
  return true;
}

/**
 * Format features for display/logging
 * @param {Object} features - Features from extractEyeFeatures
 * @returns {string} Formatted string
 */
export function formatFeatures(features) {
  if (!features) return 'No features';
  
  const { normalized } = features;
  return `
Left Eye:  Iris(${normalized.leftIrisX.toFixed(2)}, ${normalized.leftIrisY.toFixed(2)}) Aperture(${normalized.leftAperture.toFixed(2)})
Right Eye: Iris(${normalized.rightIrisX.toFixed(2)}, ${normalized.rightIrisY.toFixed(2)}) Aperture(${normalized.rightAperture.toFixed(2)})
Symmetry:  Iris(${normalized.irisSymmetry.toFixed(2)}) Aperture(${normalized.apertureSymmetry.toFixed(2)})
Vector: [${features.vector.map(v => v.toFixed(2)).join(', ')}]
  `.trim();
}

/**
 * Calculate average features from multiple samples
 * Useful for calibration data collection
 * @param {Array} featureSamples - Array of feature objects
 * @returns {Object} Averaged features
 */
export function averageFeatures(featureSamples) {
  if (!featureSamples || featureSamples.length === 0) {
    return null;
  }
  
  // Filter out invalid samples
  const validSamples = featureSamples.filter(f => areEyeFeaturesValid(f));
  
  if (validSamples.length === 0) {
    console.warn('⚠️ No valid feature samples to average');
    return null;
  }
  
  // Calculate average of each feature in the vector
  const avgVector = validSamples[0].vector.map((_, index) => {
    const sum = validSamples.reduce((acc, sample) => acc + sample.vector[index], 0);
    return sum / validSamples.length;
  });
  
  // Calculate average normalized features
  const avgNormalized = {
    leftIrisX: avgVector[0],
    leftIrisY: avgVector[1],
    leftAperture: avgVector[2],
    rightIrisX: avgVector[3],
    rightIrisY: avgVector[4],
    rightAperture: avgVector[5],
    irisSymmetry: avgVector[6],
    apertureSymmetry: avgVector[7]
  };
  
  return {
    normalized: avgNormalized,
    vector: avgVector,
    sampleCount: validSamples.length
  };
}
