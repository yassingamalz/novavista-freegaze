/**
 * Face Detection Module for NovaVista FreeGaze
 * Integrates MediaPipe FaceMesh for real-time face and eye tracking
 */

import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

// Landmark position smoother to reduce jitter
class LandmarkSmoother {
  constructor(smoothingFactor = 0.5) {
    this.smoothingFactor = smoothingFactor;
    this.previousLandmarks = null;
  }

  smooth(landmarks) {
    if (!this.previousLandmarks || this.previousLandmarks.length !== landmarks.length) {
      this.previousLandmarks = landmarks;
      return landmarks;
    }

    // Apply exponential moving average
    const smoothed = landmarks.map((landmark, i) => {
      const prev = this.previousLandmarks[i];
      return {
        x: prev.x * this.smoothingFactor + landmark.x * (1 - this.smoothingFactor),
        y: prev.y * this.smoothingFactor + landmark.y * (1 - this.smoothingFactor),
        z: prev.z * this.smoothingFactor + (landmark.z || 0) * (1 - this.smoothingFactor)
      };
    });

    this.previousLandmarks = smoothed;
    return smoothed;
  }

  reset() {
    this.previousLandmarks = null;
  }
}

// Create singleton smoother instance
const landmarkSmoother = new LandmarkSmoother(0.6); // Higher = more smoothing

/**
 * Initialize MediaPipe FaceMesh with optimized settings for eye tracking
 * @param {HTMLVideoElement} videoElement - The video element to process
 * @param {Function} onResults - Callback function for face detection results
 * @returns {Promise<{faceMesh: FaceMesh, camera: Camera}>} Initialized FaceMesh and Camera instances
 */
export async function initFaceMesh(videoElement, onResults) {
  // Create FaceMesh instance
  const faceMesh = new FaceMesh({
    locateFile: (file) => {
      // Load MediaPipe models from CDN
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
  });

  // Configure FaceMesh options
  faceMesh.setOptions({
    maxNumFaces: 1,              // Track only one face for performance
    refineLandmarks: true,        // CRITICAL: Enables iris detection (landmarks 468-477)
    minDetectionConfidence: 0.5, // Minimum confidence for face detection
    minTrackingConfidence: 0.5   // Minimum confidence for tracking
  });

  // Wrap onResults to add smoothing
  faceMesh.onResults((results) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
      // Apply smoothing to reduce jitter
      results.multiFaceLandmarks[0] = landmarkSmoother.smooth(results.multiFaceLandmarks[0]);
    } else {
      // Reset smoother when face is lost
      landmarkSmoother.reset();
    }
    onResults(results);
  });

  // Initialize camera with FaceMesh processing
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      // Send each frame to FaceMesh for processing
      await faceMesh.send({ image: videoElement });
    },
    width: 640,  // Reduced for better FPS
    height: 480  // Reduced for better FPS
  });
  
  // Start the camera
  await camera.start();
  
  console.log('✅ MediaPipe FaceMesh initialized with landmark smoothing');
  console.log('📊 Tracking mode: Single face with iris refinement');
  
  return { faceMesh, camera };
}

/**
 * Draw face landmarks on canvas for visualization (optimized)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Face landmarks from MediaPipe
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function drawFaceLandmarks(ctx, landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) return;
  
  // Use batch drawing for better performance
  ctx.save();
  
  // Draw face landmarks (cyan, smaller)
  ctx.fillStyle = 'cyan';
  ctx.globalAlpha = 0.6; // Slight transparency
  
  // Draw landmarks in batches for better performance
  for (let i = 0; i < landmarks.length; i++) {
    if (i >= 468) break; // Skip iris landmarks, will draw separately
    
    const landmark = landmarks[i];
    const x = landmark.x * width;
    const y = landmark.y * height;
    
    ctx.fillRect(x - 1, y - 1, 2, 2); // Use fillRect instead of arc (faster)
  }
  
  // Draw iris landmarks (red, larger)
  ctx.fillStyle = 'red';
  ctx.globalAlpha = 1.0;
  
  for (let i = 468; i < 478 && i < landmarks.length; i++) {
    const landmark = landmarks[i];
    const x = landmark.x * width;
    const y = landmark.y * height;
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  ctx.restore();
}

/**
 * Get specific landmark indices for eye tracking
 * Reference: https://github.com/google/mediapipe/blob/master/docs/solutions/face_mesh.md
 */
export const LANDMARK_INDICES = {
  // Left eye
  LEFT_EYE_INNER: 133,
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  
  // Right eye
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  
  // Iris centers (only available with refineLandmarks: true)
  LEFT_IRIS_CENTER: 468,
  RIGHT_IRIS_CENTER: 473,
  
  // Iris boundary points
  LEFT_IRIS: [468, 469, 470, 471, 472],   // Center, right, top, left, bottom
  RIGHT_IRIS: [473, 474, 475, 476, 477]   // Center, right, top, left, bottom
};

/**
 * Extract eye landmarks from face mesh results
 * @param {Array} landmarks - All face landmarks
 * @returns {Object} Object containing left and right eye landmarks
 */
export function extractEyeLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 478) {
    return null;
  }
  
  return {
    leftEye: {
      inner: landmarks[LANDMARK_INDICES.LEFT_EYE_INNER],
      outer: landmarks[LANDMARK_INDICES.LEFT_EYE_OUTER],
      top: landmarks[LANDMARK_INDICES.LEFT_EYE_TOP],
      bottom: landmarks[LANDMARK_INDICES.LEFT_EYE_BOTTOM],
      iris: {
        center: landmarks[LANDMARK_INDICES.LEFT_IRIS_CENTER],
        points: LANDMARK_INDICES.LEFT_IRIS.map(i => landmarks[i])
      }
    },
    rightEye: {
      inner: landmarks[LANDMARK_INDICES.RIGHT_EYE_INNER],
      outer: landmarks[LANDMARK_INDICES.RIGHT_EYE_OUTER],
      top: landmarks[LANDMARK_INDICES.RIGHT_EYE_TOP],
      bottom: landmarks[LANDMARK_INDICES.RIGHT_EYE_BOTTOM],
      iris: {
        center: landmarks[LANDMARK_INDICES.RIGHT_IRIS_CENTER],
        points: LANDMARK_INDICES.RIGHT_IRIS.map(i => landmarks[i])
      }
    }
  };
}
