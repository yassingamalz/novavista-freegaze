/**
 * NovaVista FreeGaze - Configuration File
 * Centralized settings for easy adjustment
 */

export const CONFIG = {
  // Camera Settings
  camera: {
    width: { ideal: 640 },      // Lower resolution for better FPS
    height: { ideal: 480 },     // Lower resolution for better FPS
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
    mirrorVideo: true           // Mirror horizontally (like a mirror)
  },

  // MediaPipe FaceMesh Settings
  faceMesh: {
    maxNumFaces: 1,
    refineLandmarks: true,      // CRITICAL: Enables iris detection
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  },

  // Calibration Settings
  calibration: {
    pointCount: 9,              // Number of calibration points
    samplesPerPoint: 60,        // Samples to collect per point (2 seconds at 30 FPS)
    sampleInterval: 33,         // Milliseconds between samples (~30 Hz)
    countdownTime: 3,           // Seconds to wait before collecting samples
    minPointsRequired: 9        // Minimum points needed for valid calibration
  },

  // Model Training Settings
  model: {
    epochs: 100,
    batchSize: 8,
    verbose: 0,                 // 0 = silent, 1 = progress bar
    validationSplit: 0.1
  },

  // Dwell Click Settings
  dwell: {
    dwellTime: 600,             // Milliseconds to hold gaze (reduced from 1500ms)
    threshold: 50,              // Movement threshold in pixels
    enabled: true
  },

  // Smoothing Settings
  smoothing: {
    enabled: true,
    minCutoff: 0.3,             // 1€ filter parameter
    beta: 0.7,                  // 1€ filter parameter
    dCutoff: 1.0                // 1€ filter parameter
  },

  // UI Settings
  ui: {
    showFPS: true,
    showLandmarks: true,
    cursorSize: 20,
    cursorColor: '#00ff88',
    enableLogging: false        // Disable excessive console logs for better FPS
  },

  // Performance Settings
  performance: {
    targetFPS: 30,
    logThrottle: 1000           // Minimum ms between performance logs
  }
};

export default CONFIG;
